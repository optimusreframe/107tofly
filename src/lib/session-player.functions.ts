import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluatePick, type ExerciseKind } from "./session-eval.server";
import { nextDueAt, nextLevel, MAX_LEVEL } from "./srs";
import { getFeatureFlags, getStudySettings } from "./runtime-settings.server";
import { touchDailyActivity } from "./streak.server";

// Public DTO — never expose `answer` or `explanation` before submit.
const PUBLIC_EXERCISE_COLS = "id,concept_id,kind,payload,difficulty,locale";
const SESSION_SIZE = 8;

async function assertEnabled() {
  const flags = await getFeatureFlags();
  if (!flags.sessionPlayerEnabled) {
    throw new Response("Session Player is disabled", { status: 403 });
  }
}

export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ unitId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertEnabled();
    const { supabase, userId } = context;

    const { data: unit } = await supabase
      .from("learning_units")
      .select("id,slug,title,status")
      .eq("id", data.unitId)
      .eq("status", "published")
      .maybeSingle();
    if (!unit) throw new Response("Unit not found", { status: 404 });

    const { data: concepts } = await supabase
      .from("concepts")
      .select("id")
      .eq("unit_id", data.unitId);
    const conceptIds = (concepts ?? []).map((c) => c.id as string);
    if (conceptIds.length === 0) {
      return { unit, exercises: [] as Array<Record<string, any>> };
    }

    // Prefer due-first: concepts whose mastery.next_due_at <= now, else new/unseen.
    const { data: mastery } = await supabase
      .from("mastery")
      .select("concept_id,next_due_at,level")
      .eq("user_id", userId)
      .in("concept_id", conceptIds);
    const nowMs = Date.now();
    const dueSet = new Set<string>();
    const seen = new Set<string>();
    for (const m of mastery ?? []) {
      seen.add(m.concept_id as string);
      if (m.next_due_at && new Date(m.next_due_at as string).getTime() <= nowMs) {
        dueSet.add(m.concept_id as string);
      }
    }
    const prioritized: string[] = [
      ...conceptIds.filter((id) => dueSet.has(id)),
      ...conceptIds.filter((id) => !seen.has(id)),
      ...conceptIds.filter((id) => seen.has(id) && !dueSet.has(id)),
    ];

    const pickConceptIds = prioritized.slice(0, SESSION_SIZE);
    const { data: exs } = await supabase
      .from("exercises")
      .select(PUBLIC_EXERCISE_COLS)
      .in("concept_id", pickConceptIds);

    // One exercise per concept (first, deterministic).
    const byConcept = new Map<string, Record<string, any>>();
    for (const e of exs ?? []) {
      const cid = e.concept_id as string;
      if (!byConcept.has(cid)) byConcept.set(cid, e as Record<string, any>);
    }
    const exercises = pickConceptIds
      .map((id) => byConcept.get(id))
      .filter(Boolean) as Array<Record<string, any>>;

    await supabase.from("session_events").insert({
      user_id: userId, unit_id: data.unitId, kind: "start",
    });

    return { unit, exercises };
  });

export const submitExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      exerciseId: z.string().uuid(),
      unitId: z.string().uuid(),
      pick: z.unknown(),
      latencyMs: z.number().min(0).max(600_000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEnabled();
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load full exercise with answer/explanation via admin (bypasses public DTO restriction).
    const { data: ex, error } = await supabaseAdmin
      .from("exercises")
      .select("id,concept_id,kind,answer,explanation")
      .eq("id", data.exerciseId)
      .maybeSingle();
    if (error || !ex) throw new Response("Exercise not found", { status: 404 });

    const kind = ex.kind as ExerciseKind;
    const correct = evaluatePick(kind, ex.answer, data.pick);

    // Update mastery (SM-2 lite).
    const { data: existing } = await supabase
      .from("mastery")
      .select("level,correct_streak")
      .eq("user_id", userId)
      .eq("concept_id", ex.concept_id as string)
      .maybeSingle();
    const prevLevel = Number(existing?.level ?? 0);
    const prevStreak = Number(existing?.correct_streak ?? 0);
    const newLevel = nextLevel(prevLevel, correct);
    const newStreak = correct ? Math.min(999, prevStreak + 1) : 0;
    const due = nextDueAt(newLevel);
    await supabase.from("mastery").upsert({
      user_id: userId,
      concept_id: ex.concept_id as string,
      level: newLevel,
      correct_streak: newStreak,
      last_seen_at: new Date().toISOString(),
      next_due_at: due.toISOString(),
    });

    await supabase.from("session_events").insert({
      user_id: userId,
      unit_id: data.unitId,
      concept_id: ex.concept_id as string,
      exercise_id: ex.id as string,
      kind: "answer",
      correct,
      latency_ms: data.latencyMs ?? null,
    });

    return {
      correct,
      explanation: ex.explanation ?? null,
      answer: ex.answer,
      mastery: { level: newLevel, prevLevel, nextDueAt: due.toISOString(), maxLevel: MAX_LEVEL },
    };
  });

export const endSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ unitId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertEnabled();
    const { supabase, userId } = context;

    // Count answers since latest start.
    const { data: startEv } = await supabase
      .from("session_events")
      .select("created_at")
      .eq("user_id", userId)
      .eq("unit_id", data.unitId)
      .eq("kind", "start")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const since = (startEv?.created_at as string | undefined) ?? new Date(Date.now() - 60 * 60_000).toISOString();

    const { data: answers } = await supabase
      .from("session_events")
      .select("correct")
      .eq("user_id", userId)
      .eq("unit_id", data.unitId)
      .eq("kind", "answer")
      .gte("created_at", since);
    const total = answers?.length ?? 0;
    const correct = (answers ?? []).filter((a) => a.correct === true).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const { lessonQuizPassXp, quizPassScore } = await getStudySettings();
    const passed = score >= Number(quizPassScore ?? 70);
    const xp = passed ? Number(lessonQuizPassXp ?? 20) : 0;

    await supabase.from("session_events").insert({
      user_id: userId, unit_id: data.unitId, kind: "end", correct: passed,
    });
    if (total > 0) await touchDailyActivity(supabase, userId);

    return { total, correct, score, passed, xpAwarded: xp };
  });
