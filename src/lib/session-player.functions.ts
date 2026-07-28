import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluatePick, type ExerciseKind } from "./session-eval.server";
import { nextDueAt, nextLevel, MAX_LEVEL } from "./srs";
import { getFeatureFlags, getStudySettings } from "./runtime-settings.server";
import { touchDailyActivity } from "./streak.server";
import { enforceRateLimit } from "./rate-limit.server";
import { logger } from "./logger.server";
import { computeXpMultipliers } from "./inventory.server";

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
    const levelBy = new Map<string, number>();
    for (const m of mastery ?? []) {
      const cid = m.concept_id as string;
      seen.add(cid);
      levelBy.set(cid, Number(m.level ?? 0));
      if (m.next_due_at && new Date(m.next_due_at as string).getTime() <= nowMs) {
        dueSet.add(cid);
      }
    }
    // Within each bucket, weakest concept (lowest level) first — adaptive priority.
    const byLevelAsc = (a: string, b: string) => (levelBy.get(a) ?? 0) - (levelBy.get(b) ?? 0);
    const prioritized: string[] = [
      ...conceptIds.filter((id) => dueSet.has(id)).sort(byLevelAsc),
      ...conceptIds.filter((id) => !seen.has(id)),
      ...conceptIds.filter((id) => seen.has(id) && !dueSet.has(id)).sort(byLevelAsc),
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
      usedHint: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEnabled();
    const { supabase, userId } = context;
    await enforceRateLimit(supabase, userId, { windowSec: 60, max: 60, kinds: ["answer"] });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ex, error } = await supabaseAdmin
      .from("exercises")
      .select("id,concept_id,kind,answer,explanation")
      .eq("id", data.exerciseId)
      .maybeSingle();
    if (error || !ex) { logger.warn("submitExercise.notfound", { exerciseId: data.exerciseId }); throw new Response("Exercise not found", { status: 404 }); }

    const kind = ex.kind as ExerciseKind;
    const correct = evaluatePick(kind, ex.answer, data.pick);

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
      note: data.usedHint ? "hint" : null,
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

    // Idempotency guard: if an 'end' event already exists for this session window,
    // do not re-award XP or re-touch streak. The client may remount / refresh.
    const { data: prevEnd } = await supabase
      .from("session_events")
      .select("id")
      .eq("user_id", userId)
      .eq("unit_id", data.unitId)
      .eq("kind", "end")
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();

    const { data: answers } = await supabase
      .from("session_events")
      .select("correct,note,concept_id,created_at")
      .eq("user_id", userId)
      .eq("unit_id", data.unitId)
      .eq("kind", "answer")
      .gte("created_at", since)
      .order("created_at", { ascending: true });
    const list = answers ?? [];
    const total = list.length;
    const correct = list.filter((a) => a.correct === true).length;
    const hintCount = list.filter((a) => a.note === "hint").length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const { lessonQuizPassXp, quizPassScore } = await getStudySettings();
    const passed = score >= Number(quizPassScore ?? 70);
    const baseXp = passed ? Number(lessonQuizPassXp ?? 20) : 0;
    const penaltyFactor = Math.max(0, 1 - 0.25 * hintCount);
    const preBoostXp = Math.round(baseXp * penaltyFactor);
    const { finalXp: xp, comboBonus, boostActive, maxCombo } = await computeXpMultipliers(
      supabase, userId, preBoostXp, list.map((a) => ({ correct: a.correct as boolean | null }))
    );

    const conceptIds = Array.from(new Set(list.map((a) => a.concept_id as string).filter(Boolean)));
    let conceptsDueSoon = 0;
    let masteryDeltas: Array<{ conceptId: string; level: number }> = [];
    if (conceptIds.length) {
      const { data: mrows } = await supabase
        .from("mastery")
        .select("concept_id,level,next_due_at")
        .eq("user_id", userId)
        .in("concept_id", conceptIds);
      const soonMs = Date.now() + 24 * 60 * 60_000;
      for (const m of mrows ?? []) {
        masteryDeltas.push({ conceptId: m.concept_id as string, level: Number(m.level ?? 0) });
        if (m.next_due_at && new Date(m.next_due_at as string).getTime() <= soonMs) conceptsDueSoon++;
      }
    }

    const alreadyCompleted = !!prevEnd;
    let xpAwarded = 0;
    if (!alreadyCompleted) {
      await supabase.from("session_events").insert({
        user_id: userId, unit_id: data.unitId, kind: "end", correct: passed,
      });
      if (total > 0) await touchDailyActivity(supabase, userId);
      if (xp > 0) {
        const { data: prog } = await supabase
          .from("progress").select("xp").eq("user_id", userId).maybeSingle();
        const newXp = Number(prog?.xp ?? 0) + xp;
        await supabase.from("progress")
          .update({ xp: newXp, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        xpAwarded = xp;
      }
    }

    return { total, correct, score, passed, xpAwarded, alreadyCompleted, hintCount, conceptsPracticed: conceptIds.length, conceptsDueSoon, masteryDeltas };
  });

export const reportExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      exerciseId: z.string().uuid(),
      unitId: z.string().uuid().optional(),
      note: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEnabled();
    const { supabase, userId } = context;
    await enforceRateLimit(supabase, userId, { windowSec: 300, max: 10, kinds: ["feedback"] });
    const { data: ex } = await supabase
      .from("exercises")
      .select("id,concept_id")
      .eq("id", data.exerciseId)
      .maybeSingle();
    if (!ex) throw new Response("Exercise not found", { status: 404 });
    await supabase.from("session_events").insert({
      user_id: userId,
      unit_id: data.unitId ?? null,
      concept_id: ex.concept_id as string,
      exercise_id: ex.id as string,
      kind: "feedback",
      note: data.note ?? null,
    });
    return { ok: true };
  });

// Adaptive review: list published units with due-concept counts for this user.
export const getDueReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEnabled();
    const { supabase, userId } = context;
    const locale = "en"; // client can pass locale later; keep simple
    const { data: units } = await supabase
      .from("learning_units")
      .select("id,slug,locale,title,summary,order_index")
      .eq("status", "published")
      .eq("locale", locale)
      .order("order_index", { ascending: true });
    const unitList = units ?? [];
    if (unitList.length === 0) return { units: [] as Array<any> };

    const unitIds = unitList.map((u) => u.id as string);
    const { data: concepts } = await supabase
      .from("concepts")
      .select("id,unit_id")
      .in("unit_id", unitIds);
    const conceptByUnit = new Map<string, string[]>();
    for (const c of concepts ?? []) {
      const arr = conceptByUnit.get(c.unit_id as string) ?? [];
      arr.push(c.id as string);
      conceptByUnit.set(c.unit_id as string, arr);
    }
    const allConceptIds = (concepts ?? []).map((c) => c.id as string);

    const { data: mastery } = allConceptIds.length
      ? await supabase
          .from("mastery")
          .select("concept_id,next_due_at,level")
          .eq("user_id", userId)
          .in("concept_id", allConceptIds)
      : { data: [] as Array<{ concept_id: string; next_due_at: string | null; level: number }> };
    const nowMs = Date.now();
    const dueSet = new Set<string>();
    const seenSet = new Set<string>();
    const levelByConcept = new Map<string, number>();
    for (const m of mastery ?? []) {
      seenSet.add(m.concept_id as string);
      levelByConcept.set(m.concept_id as string, Number(m.level ?? 0));
      if (m.next_due_at && new Date(m.next_due_at as string).getTime() <= nowMs) {
        dueSet.add(m.concept_id as string);
      }
    }

    const out = unitList.map((u) => {
      const ids = conceptByUnit.get(u.id as string) ?? [];
      const dueCount = ids.filter((id) => dueSet.has(id)).length;
      const newCount = ids.filter((id) => !seenSet.has(id)).length;
      // Mastery %: average level / 5, unseen concepts count as 0.
      const totalLevels = ids.reduce((sum, id) => sum + (levelByConcept.get(id) ?? 0), 0);
      const masteryPct = ids.length ? Math.round((totalLevels / (ids.length * 5)) * 100) : 0;
      return {
        id: u.id, slug: u.slug, title: u.title, summary: u.summary,
        conceptCount: ids.length, dueCount, newCount, masteryPct,
      };
    });
    return { units: out };
  });

// ---------- Daily Flight (cross-unit adaptive mini-session) ----------
const DAILY_FLIGHT_SIZE = 6;
const DAILY_FLIGHT_MARK = "daily_flight";

export const startDailyFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEnabled();
    const { supabase, userId } = context;

    // Pull all published units + concepts (respect locale later if needed).
    const { data: units } = await supabase
      .from("learning_units")
      .select("id,locale")
      .eq("status", "published");
    const unitIds = (units ?? []).map((u) => u.id as string);
    if (unitIds.length === 0) return { exercises: [] as Array<Record<string, any>> };

    const { data: concepts } = await supabase
      .from("concepts")
      .select("id,unit_id")
      .in("unit_id", unitIds);
    const conceptIds = (concepts ?? []).map((c) => c.id as string);
    if (conceptIds.length === 0) return { exercises: [] as Array<Record<string, any>> };

    const { data: mastery } = await supabase
      .from("mastery")
      .select("concept_id,next_due_at,level")
      .eq("user_id", userId)
      .in("concept_id", conceptIds);
    const nowMs = Date.now();
    const levelBy = new Map<string, number>();
    const dueSet = new Set<string>();
    const seenSet = new Set<string>();
    for (const m of mastery ?? []) {
      const cid = m.concept_id as string;
      seenSet.add(cid);
      levelBy.set(cid, Number(m.level ?? 0));
      if (m.next_due_at && new Date(m.next_due_at as string).getTime() <= nowMs) dueSet.add(cid);
    }

    // Priority: due → weakest (lowest level, seen) → new/unseen.
    const dueIds = conceptIds.filter((id) => dueSet.has(id));
    const weakIds = conceptIds
      .filter((id) => seenSet.has(id) && !dueSet.has(id))
      .sort((a, b) => (levelBy.get(a) ?? 0) - (levelBy.get(b) ?? 0));
    const newIds = conceptIds.filter((id) => !seenSet.has(id));
    const pickIds = [...dueIds, ...weakIds, ...newIds].slice(0, DAILY_FLIGHT_SIZE);

    const { data: exs } = await supabase
      .from("exercises")
      .select(`${PUBLIC_EXERCISE_COLS},concepts(unit_id)`)
      .in("concept_id", pickIds);

    const byConcept = new Map<string, Record<string, any>>();
    for (const e of exs ?? []) {
      const cid = (e as any).concept_id as string;
      if (!byConcept.has(cid)) {
        const unit_id = ((e as any).concepts as { unit_id: string } | null)?.unit_id ?? null;
        byConcept.set(cid, { ...e, unit_id });
      }
    }
    const exercises = pickIds.map((id) => byConcept.get(id)).filter(Boolean) as Array<Record<string, any>>;

    await supabase.from("session_events").insert({
      user_id: userId, unit_id: null, kind: "start", note: DAILY_FLIGHT_MARK,
    });

    return { exercises };
  });

export const submitDailyFlightExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      exerciseId: z.string().uuid(),
      pick: z.unknown(),
      latencyMs: z.number().min(0).max(600_000).optional(),
      usedHint: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEnabled();
    const { supabase, userId } = context;
    await enforceRateLimit(supabase, userId, { windowSec: 60, max: 60, kinds: ["answer"] });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ex, error } = await supabaseAdmin
      .from("exercises")
      .select("id,concept_id,kind,answer,explanation,concepts(unit_id)")
      .eq("id", data.exerciseId)
      .maybeSingle();
    if (error || !ex) throw new Response("Exercise not found", { status: 404 });

    const kind = ex.kind as ExerciseKind;
    const correct = evaluatePick(kind, ex.answer, data.pick);
    const unitId = ((ex as any).concepts as { unit_id: string } | null)?.unit_id ?? null;

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
      unit_id: unitId,
      concept_id: ex.concept_id as string,
      exercise_id: ex.id as string,
      kind: "answer",
      correct,
      latency_ms: data.latencyMs ?? null,
      note: data.usedHint ? `${DAILY_FLIGHT_MARK}:hint` : DAILY_FLIGHT_MARK,
    });

    return {
      correct,
      explanation: ex.explanation ?? null,
      answer: ex.answer,
      mastery: { level: newLevel, prevLevel, nextDueAt: due.toISOString(), maxLevel: MAX_LEVEL },
    };
  });

export const endDailyFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEnabled();
    const { supabase, userId } = context;

    const { data: startEv } = await supabase
      .from("session_events")
      .select("created_at")
      .eq("user_id", userId)
      .eq("kind", "start")
      .eq("note", DAILY_FLIGHT_MARK)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const since = (startEv?.created_at as string | undefined) ?? new Date(Date.now() - 60 * 60_000).toISOString();

    // Idempotency guard for Daily Flight.
    const { data: prevEnd } = await supabase
      .from("session_events")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "end")
      .eq("note", DAILY_FLIGHT_MARK)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();

    const { data: answers } = await supabase
      .from("session_events")
      .select("correct,note,concept_id")
      .eq("user_id", userId)
      .eq("kind", "answer")
      .in("note", [DAILY_FLIGHT_MARK, `${DAILY_FLIGHT_MARK}:hint`])
      .gte("created_at", since);
    const list = answers ?? [];
    const total = list.length;
    const correct = list.filter((a) => a.correct === true).length;
    const hintCount = list.filter((a) => (a.note as string) === `${DAILY_FLIGHT_MARK}:hint`).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const { lessonQuizPassXp, quizPassScore } = await getStudySettings();
    const passed = score >= Number(quizPassScore ?? 70);
    const baseXp = passed ? Number(lessonQuizPassXp ?? 20) : 0;
    const penaltyFactor = Math.max(0, 1 - 0.25 * hintCount);
    const xp = Math.round(baseXp * penaltyFactor);

    const conceptIds = Array.from(new Set(list.map((a) => a.concept_id as string).filter(Boolean)));
    let conceptsDueSoon = 0;
    if (conceptIds.length) {
      const { data: mrows } = await supabase
        .from("mastery")
        .select("next_due_at")
        .eq("user_id", userId)
        .in("concept_id", conceptIds);
      const soonMs = Date.now() + 24 * 60 * 60_000;
      for (const m of mrows ?? []) {
        if (m.next_due_at && new Date(m.next_due_at as string).getTime() <= soonMs) conceptsDueSoon++;
      }
    }

    const alreadyCompleted = !!prevEnd;
    let xpAwarded = 0;
    if (!alreadyCompleted) {
      await supabase.from("session_events").insert({
        user_id: userId, unit_id: null, kind: "end", correct: passed, note: DAILY_FLIGHT_MARK,
      });
      if (total > 0) await touchDailyActivity(supabase, userId);
      if (xp > 0) {
        const { data: prog } = await supabase
          .from("progress").select("xp").eq("user_id", userId).maybeSingle();
        const newXp = Number(prog?.xp ?? 0) + xp;
        await supabase.from("progress")
          .update({ xp: newXp, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        xpAwarded = xp;
      }
    }

    return { total, correct, score, passed, xpAwarded, alreadyCompleted, hintCount, conceptsPracticed: conceptIds.length, conceptsDueSoon };
  });
