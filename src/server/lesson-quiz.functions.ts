import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TOPICS = ["regulations","airspace","sectional","weather","performance","operations","adm","emergencies","remote_id","maintenance"] as const;
const QUIZ_SIZE = 6;
const PASS_THRESHOLD = 70;
const QUIZ_XP = 20;

type QuestionRow = {
  id: string;
  topic: string;
  acs_code: string | null;
  source: string | null;
  question: string;
  options: unknown[];
  explanation: string;
  common_mistake: string | null;
  correct_index: number;
  locale: string;
};

// ============ GET LESSON QUIZ ============
export const getLessonQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      slug: z.string().min(1).max(120),
      locale: z.enum(["en", "es"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const locale = data.locale ?? "en";

    const { data: lesson } = await supabase
      .from("lessons")
      .select("id,slug,topic")
      .eq("slug", data.slug)
      .eq("status", "published")
      .limit(1)
      .maybeSingle();

    if (!lesson) return { lesson: null, questions: [], fallback: false, topic: null };
    const topic = (lesson.topic as string | null) ?? null;
    if (!topic) return { lesson: { id: lesson.id, slug: lesson.slug, topic: null }, questions: [], fallback: false, topic: null };

    const cols = "id,topic,acs_code,source,question,options,explanation,common_mistake,correct_index,locale";
    const fetchByLocale = async (loc: "en" | "es") => {
      const { data: rows, error } = await supabase
        .from("questions")
        .select(cols)
        .eq("status", "published")
        .eq("topic", topic as (typeof TOPICS)[number])
        .eq("locale", loc);
      if (error) throw error;
      return (rows ?? []) as unknown as QuestionRow[];
    };

    let rows: QuestionRow[] = [];
    let fallback = false;
    if (locale !== "en") {
      rows = await fetchByLocale(locale);
    }
    if (rows.length < QUIZ_SIZE) {
      const en = await fetchByLocale("en");
      const have = new Set(rows.map((r) => r.id));
      const extra = en.filter((r) => !have.has(r.id));
      if (extra.length > 0 && locale !== "en") fallback = true;
      rows = [...rows, ...extra];
    }

    const shuffled = [...rows].sort(() => Math.random() - 0.5).slice(0, Math.min(QUIZ_SIZE, Math.max(rows.length, 0)));
    const annotated = shuffled.map((r) => ({ ...r, fallback: locale !== "en" && r.locale !== locale }));

    return {
      lesson: { id: lesson.id, slug: lesson.slug, topic },
      questions: annotated,
      fallback,
      topic,
    };
  });

// ============ GET LESSON QUIZ STATUS ============
export const getLessonQuizStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("lesson_quiz_progress")
      .select("attempts_count,best_score,passed,xp_awarded,last_attempt_at")
      .eq("user_id", userId)
      .eq("lesson_slug", data.slug)
      .maybeSingle();
    return {
      attempts_count: row?.attempts_count ?? 0,
      best_score: row?.best_score ?? 0,
      passed: row?.passed ?? false,
      xp_awarded: row?.xp_awarded ?? false,
      last_attempt_at: row?.last_attempt_at ?? null,
    };
  });

// ============ SUBMIT LESSON QUIZ ATTEMPT ============
export const submitLessonQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      lesson_slug: z.string().min(1).max(120),
      topic: z.enum(TOPICS).optional(),
      duration_sec: z.number().min(0).max(8000).optional(),
      answers: z
        .array(
          z.object({
            question_id: z.string().uuid(),
            selected_index: z.number().min(0).max(10),
            is_correct: z.boolean(),
            time_ms: z.number().optional(),
          }),
        )
        .min(1)
        .max(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: lesson } = await supabase
      .from("lessons")
      .select("id,topic")
      .eq("slug", data.lesson_slug)
      .limit(1)
      .maybeSingle();
    const lessonId = (lesson?.id as string | undefined) ?? null;
    const topic = data.topic ?? ((lesson?.topic as string | undefined) ?? undefined);

    const total = data.answers.length;
    const correct = data.answers.filter((a) => a.is_correct).length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= PASS_THRESHOLD;

    const { data: attempt, error: aerr } = await supabase
      .from("quiz_attempts")
      .insert({
        user_id: userId,
        mode: "daily",
        topic,
        total,
        correct,
        score,
        duration_sec: data.duration_sec,
        finished_at: new Date().toISOString(),
        lesson_id: lessonId,
        lesson_slug: data.lesson_slug,
        attempt_type: "lesson_quiz",
      })
      .select("id")
      .single();
    if (aerr || !attempt) throw aerr ?? new Error("attempt insert failed");

    await supabase.from("quiz_answers").insert(
      data.answers.map((a) => ({
        attempt_id: attempt.id,
        user_id: userId,
        question_id: a.question_id,
        selected_index: a.selected_index,
        is_correct: a.is_correct,
        time_ms: a.time_ms,
      })) as never,
    );

    // Upsert lesson_quiz_progress + award XP idempotently
    const { data: prev } = await supabase
      .from("lesson_quiz_progress")
      .select("id,best_score,attempts_count,passed,xp_awarded")
      .eq("user_id", userId)
      .eq("lesson_slug", data.lesson_slug)
      .maybeSingle();

    const prevBest = prev?.best_score ?? 0;
    const newBest = Math.max(prevBest, score);
    const wasPassed = !!prev?.passed;
    const nowPassed = wasPassed || passed;
    const alreadyAwarded = !!prev?.xp_awarded;
    const shouldAwardXp = nowPassed && !alreadyAwarded;

    const upsertRow = {
      user_id: userId,
      lesson_id: lessonId,
      lesson_slug: data.lesson_slug,
      best_score: newBest,
      attempts_count: (prev?.attempts_count ?? 0) + 1,
      passed: nowPassed,
      xp_awarded: alreadyAwarded || shouldAwardXp,
      last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (prev) {
      await supabase.from("lesson_quiz_progress").update(upsertRow).eq("id", prev.id);
    } else {
      await supabase.from("lesson_quiz_progress").insert(upsertRow);
    }

    let xp_awarded_now = 0;
    if (shouldAwardXp) {
      const { data: prog } = await supabase
        .from("progress")
        .select("xp")
        .eq("user_id", userId)
        .maybeSingle();
      const newXp = (prog?.xp ?? 0) + QUIZ_XP;
      await supabase
        .from("progress")
        .update({ xp: newXp, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      xp_awarded_now = QUIZ_XP;
    }

    return {
      attempt_id: attempt.id,
      score,
      correct,
      total,
      passed,
      best_score: newBest,
      attempts_count: upsertRow.attempts_count,
      xp_awarded_now,
    };
  });

// ============ CREATE FLASHCARDS FROM MISSED ============
export const createFlashcardsFromMissed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ question_ids: z.array(z.string().uuid()).min(1).max(20) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("flashcards")
      .select("question_id")
      .eq("user_id", userId)
      .in("question_id", data.question_ids);
    const have = new Set((existing ?? []).map((r) => r.question_id as string));
    const todo = data.question_ids.filter((id) => !have.has(id));
    if (todo.length === 0) return { created: 0, skipped: data.question_ids.length };

    const { data: questions } = await supabase
      .from("questions")
      .select("id,question,explanation,topic")
      .in("id", todo);

    const rows = (questions ?? []).map((q) => ({
      user_id: userId,
      question_id: q.id as string,
      front: q.question as string,
      back: q.explanation as string,
      topic: q.topic as string,
    }));
    if (rows.length > 0) await supabase.from("flashcards").insert(rows);
    return { created: rows.length, skipped: data.question_ids.length - rows.length };
  });
