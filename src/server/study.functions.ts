import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TOPICS = ["regulations","airspace","sectional","weather","performance","operations","adm","emergencies","remote_id","maintenance"] as const;

// ============ FETCH PRACTICE QUESTIONS ============
export const fetchPracticeQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    topic: z.enum(TOPICS).optional(),
    limit: z.number().min(1).max(60).default(10),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("questions").select("id,topic,acs_code,source,question,options,explanation,common_mistake,correct_index").limit(data.limit);
    if (data.topic) q = q.eq("topic", data.topic);
    const { data: rows, error } = await q;
    if (error) throw error;
    // shuffle
    return [...(rows ?? [])].sort(() => Math.random() - 0.5);
  });

// ============ SUBMIT QUIZ ATTEMPT ============
export const submitQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    mode: z.enum(["practice","daily","exam"]).default("practice"),
    topic: z.enum(TOPICS).optional(),
    duration_sec: z.number().min(0).max(8000).optional(),
    answers: z.array(z.object({
      question_id: z.string().uuid(),
      selected_index: z.number().min(0).max(10),
      is_correct: z.boolean(),
      time_ms: z.number().optional(),
    })).min(1).max(120),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const total = data.answers.length;
    const correct = data.answers.filter(a => a.is_correct).length;
    const score = (correct / total) * 100;

    const { data: attempt, error: aerr } = await supabase
      .from("quiz_attempts")
      .insert({
        user_id: userId,
        mode: data.mode,
        topic: data.topic,
        total, correct, score,
        duration_sec: data.duration_sec,
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (aerr || !attempt) throw aerr ?? new Error("attempt insert failed");

    const rows = data.answers.map(a => ({
      attempt_id: attempt.id,
      user_id: userId,
      question_id: a.question_id,
      selected_index: a.selected_index,
      is_correct: a.is_correct,
      time_ms: a.time_ms,
    }));
    await supabase.from("quiz_answers").insert(rows);

    // recompute progress
    await recomputeProgress(supabase, userId);

    return { attempt_id: attempt.id, score, correct, total };
  });

// ============ COMPLETE LESSON ============
export const completeLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    lesson_slug: z.string().min(1).max(120),
    topic: z.enum(TOPICS).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("lesson_completions").upsert({
      user_id: userId,
      lesson_slug: data.lesson_slug,
      topic: data.topic,
    }, { onConflict: "user_id,lesson_slug" });
    await recomputeProgress(supabase, userId);
    return { ok: true };
  });

// ============ FLASHCARD: GRADE (SM-2 simplified) ============
export const gradeFlashcard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    flashcard_id: z.string().uuid(),
    grade: z.enum(["again","hard","good","easy"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: card } = await supabase
      .from("flashcards").select("*").eq("id", data.flashcard_id).eq("user_id", userId).single();
    if (!card) throw new Error("card not found");

    const q = { again: 0, hard: 3, good: 4, easy: 5 }[data.grade];
    let { ease, interval_days, repetitions } = card as { ease: number; interval_days: number; repetitions: number };
    if (q < 3) {
      repetitions = 0;
      interval_days = 1;
    } else {
      repetitions += 1;
      if (repetitions === 1) interval_days = 1;
      else if (repetitions === 2) interval_days = 6;
      else interval_days = Math.round(interval_days * ease);
      ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    }
    const due = new Date();
    due.setDate(due.getDate() + interval_days);

    await supabase.from("flashcards").update({
      ease, interval_days, repetitions,
      due_date: due.toISOString().slice(0, 10),
      last_reviewed_at: new Date().toISOString(),
    }).eq("id", data.flashcard_id).eq("user_id", userId);
    await recomputeProgress(supabase, userId);
    return { ease, interval_days, repetitions };
  });

// ============ FLASHCARD: CREATE FROM QUESTION ============
export const createFlashcardFromQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ question_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: q } = await supabase.from("questions").select("question,explanation,topic").eq("id", data.question_id).single();
    if (!q) throw new Error("question not found");
    await supabase.from("flashcards").insert({
      user_id: userId,
      question_id: data.question_id,
      front: q.question,
      back: q.explanation,
      topic: q.topic,
    });
    return { ok: true };
  });

// ============ DUE FLASHCARDS ============
export const fetchDueFlashcards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("flashcards")
      .select("id,front,back,topic,due_date,interval_days")
      .eq("user_id", userId)
      .lte("due_date", today)
      .order("due_date")
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });

// ============ ONBOARDING SAVE ============
export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    experience_level: z.string().min(1).max(40),
    study_goal_date: z.string().optional(),
    locale: z.string().min(2).max(8).optional(),
    display_name: z.string().min(1).max(80).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("profiles").update({
      experience_level: data.experience_level,
      study_goal_date: data.study_goal_date || null,
      locale: data.locale ?? "es",
      display_name: data.display_name,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
    return { ok: true };
  });

// ============ SUBMIT EXAM SIMULATION ============
export const submitExamSimulation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    duration_sec: z.number().min(0).max(8000),
    answers: z.array(z.object({
      question_id: z.string().uuid(),
      topic: z.enum(TOPICS),
      selected_index: z.number(),
      is_correct: z.boolean(),
    })).min(10).max(120),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const total = data.answers.length;
    const correct = data.answers.filter(a => a.is_correct).length;
    const score = (correct / total) * 100;
    const breakdown: Record<string, { total: number; correct: number }> = {};
    for (const a of data.answers) {
      breakdown[a.topic] ??= { total: 0, correct: 0 };
      breakdown[a.topic].total += 1;
      if (a.is_correct) breakdown[a.topic].correct += 1;
    }
    const { data: sim, error } = await supabase.from("exam_simulations").insert({
      user_id: userId,
      total, correct, score,
      duration_sec: data.duration_sec,
      domain_breakdown: breakdown,
      finished_at: new Date().toISOString(),
    }).select("id").single();
    if (error) throw error;
    await recomputeProgress(supabase, userId);
    return { id: sim!.id, score, correct, total, breakdown };
  });

// ============ ISSUE CERTIFICATE ============
export const issueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: sims } = await supabase.from("exam_simulations")
      .select("score,finished_at").eq("user_id", userId).order("finished_at", { ascending: false }).limit(5);
    const latest = sims?.[0];
    const passingSims = (sims ?? []).filter(s => Number(s.score) >= 85).length;
    if (!latest || Number(latest.score) < 85 || passingSims < 1) {
      return { ok: false, reason: "Necesitas un simulacro con score ≥ 85% para emitir tu certificado." };
    }
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
    const { data: progress } = await supabase.from("progress").select("readiness").eq("user_id", userId).single();
    const { data: completions } = await supabase.from("lesson_completions").select("lesson_slug").eq("user_id", userId);

    const { data: cert, error } = await supabase.from("certificates").insert({
      user_id: userId,
      display_name: profile?.display_name ?? "Pilot",
      final_score: Number(latest.score),
      modules_completed: completions?.length ?? 0,
      hours_estimated: 56,
    }).select("id").single();
    if (error) throw error;
    return { ok: true, id: cert!.id, readiness: progress?.readiness ?? 0 };
  });

// ============ HELPERS ============
async function recomputeProgress(supabase: ReturnType<typeof requireSupabaseAuth>["__type__"]["supabase"] extends infer S ? S : any, userId: string) {
  const [{ data: attempts }, { data: cards }, { data: lessons }, { data: sims }] = await Promise.all([
    supabase.from("quiz_attempts").select("score").eq("user_id", userId),
    supabase.from("flashcards").select("repetitions"),
    supabase.from("lesson_completions").select("id").eq("user_id", userId),
    supabase.from("exam_simulations").select("score").eq("user_id", userId).order("finished_at", { ascending: false }).limit(3),
  ]);
  const quizAvg = attempts && attempts.length ? attempts.reduce((s: number, a: { score: number }) => s + Number(a.score), 0) / attempts.length : 0;
  const simAvg = sims && sims.length ? sims.reduce((s: number, a: { score: number }) => s + Number(a.score), 0) / sims.length : 0;
  const srRetention = cards && cards.length ? Math.min(100, (cards.filter((c: { repetitions: number }) => c.repetitions >= 2).length / cards.length) * 100) : 0;
  const lessonsTotal = 28;
  const studyPct = Math.min(100, Math.round(((lessons?.length ?? 0) / lessonsTotal) * 100));
  const practicePct = Math.round(quizAvg);
  const reviewPct = Math.round(srRetention);
  const readiness = Math.round(0.4 * quizAvg + 0.25 * simAvg + 0.2 * srRetention + 0.15 * studyPct);

  // simple xp & streak (xp = lessons*50 + attempts*20 + cards*5)
  const xp = (lessons?.length ?? 0) * 50 + (attempts?.length ?? 0) * 20 + (cards?.length ?? 0) * 5;

  await supabase.from("progress").update({
    study_pct: studyPct,
    practice_pct: practicePct,
    review_pct: reviewPct,
    readiness,
    xp,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
}
