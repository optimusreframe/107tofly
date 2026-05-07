import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { touchDailyActivity } from "./streak.server";
import { getCertificateSettings, getFeatureFlags, getStudySettings } from "./runtime-settings.server";

const TOPICS = ["regulations","airspace","sectional","weather","performance","operations","adm","emergencies","remote_id","maintenance"] as const;

// ============ FETCH PRACTICE QUESTIONS ============
export const fetchPracticeQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    topic: z.enum(TOPICS).optional(),
    limit: z.number().min(1).max(60).default(10),
    locale: z.enum(["en","es"]).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const locale = data.locale ?? "en";
    const cols = "id,topic,acs_code,source,question,options,explanation,common_mistake,correct_index,locale,translation_group_id";
    const buildQ = (loc: "en"|"es") => {
      let q = supabase.from("questions").select(cols).eq("status","published").eq("locale", loc).limit(data.limit);
      if (data.topic) q = q.eq("topic", data.topic);
      return q;
    };
    let rows: Array<Record<string, unknown>> = [];
    let fallback = false;
    if (locale !== "en") {
      const r = await buildQ(locale);
      if (r.error) throw r.error;
      rows = (r.data ?? []) as Array<Record<string, unknown>>;
    }
    if (rows.length < data.limit) {
      const need = data.limit - rows.length;
      let q = supabase.from("questions").select(cols).eq("status","published").eq("locale","en").limit(need * 2);
      if (data.topic) q = q.eq("topic", data.topic);
      const r = await q;
      if (r.error) throw r.error;
      const haveIds = new Set(rows.map((x) => x.id as string));
      const haveGroups = new Set(rows.map((x) => (x.translation_group_id as string | null) ?? (x.id as string)));
      const extra = ((r.data ?? []) as Array<Record<string, unknown>>).filter((x) => {
        const gid = (x.translation_group_id as string | null) ?? (x.id as string);
        if (haveIds.has(x.id as string)) return false;
        if (haveGroups.has(gid)) return false;
        haveGroups.add(gid);
        return true;
      }).slice(0, need);
      if (extra.length > 0 && locale !== "en") fallback = true;
      rows = [...rows, ...extra];
    }
    const shuffled = [...rows].sort(() => Math.random() - 0.5).map((r) => ({ ...r, fallback: locale !== "en" && r.locale !== locale }));
    return { questions: shuffled, fallback };
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
    // detect prior completion to keep XP idempotent per lesson
    const { data: existing } = await supabase
      .from("lesson_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("lesson_slug", data.lesson_slug)
      .maybeSingle();
    await supabase.from("lesson_completions").upsert({
      user_id: userId,
      lesson_slug: data.lesson_slug,
      topic: data.topic,
    }, { onConflict: "user_id,lesson_slug" });
    let xp_awarded_now = 0;
    if (!existing) {
      const { lessonCompletionXp } = await getStudySettings();
      const { data: prog } = await supabase
        .from("progress").select("xp").eq("user_id", userId).maybeSingle();
      const newXp = (prog?.xp ?? 0) + Number(lessonCompletionXp ?? 15);
      await supabase
        .from("progress")
        .update({ xp: newXp, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      xp_awarded_now = Number(lessonCompletionXp ?? 15);
    }
    await recomputeProgress(supabase, userId);
    return { ok: true, xp_awarded_now };
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
    const flags = await getFeatureFlags();
    if (!flags.certificatesEnabled) {
      return { ok: false, reason: "CERTIFICATES_DISABLED" };
    }
    const cs = await getCertificateSettings();
    const minLatest = Number(cs.minLatestExamScore ?? 85);
    const requiredSims = Number(cs.requiredExamSimulations ?? 2);
    const minQuizAvg = Number(cs.minQuizAverage ?? 80);
    const minCoursePct = Number(cs.minCourseCompletionPercent ?? 100);
    const estHours = Number(cs.estimatedHours ?? 56);

    const [{ data: sims }, { data: completions }, { count: lessonsTotal }, { data: attempts }] = await Promise.all([
      supabase.from("exam_simulations")
        .select("score,finished_at").eq("user_id", userId).order("finished_at", { ascending: false }).limit(20),
      supabase.from("lesson_completions").select("lesson_slug").eq("user_id", userId),
      supabase.from("lessons").select("*", { count: "exact", head: true }),
      supabase.from("quiz_attempts").select("score").eq("user_id", userId),
    ]);
    const latest = sims?.[0];
    const passingSims = (sims ?? []).filter((s) => Number(s.score) >= minLatest).length;
    const quizAvg = attempts && attempts.length
      ? attempts.reduce((s: number, a: { score: number }) => s + Number(a.score), 0) / attempts.length
      : 0;
    const totalLessons = (lessonsTotal as number | null) ?? 0;
    const coursePct = totalLessons > 0 ? Math.round(((completions?.length ?? 0) / totalLessons) * 100) : 0;

    const reasons: string[] = [];
    if (!latest || Number(latest.score) < minLatest) reasons.push(`latest_exam<${minLatest}`);
    if (passingSims < requiredSims) reasons.push(`sims<${requiredSims}`);
    if (quizAvg < minQuizAvg) reasons.push(`quiz_avg<${minQuizAvg}`);
    if (coursePct < minCoursePct) reasons.push(`course<${minCoursePct}%`);
    if (reasons.length > 0) {
      return {
        ok: false,
        reason: "REQUIREMENTS_NOT_MET",
        details: reasons,
        currentReqs: {
          minLatestExamScore: minLatest,
          requiredExamSimulations: requiredSims,
          minQuizAverage: minQuizAvg,
          minCourseCompletionPercent: minCoursePct,
        },
        progress: {
          latestSim: latest ? Math.round(Number(latest.score)) : 0,
          passingSims,
          quizAvg: Math.round(quizAvg),
          coursePct,
        },
      };
    }
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
    const { data: progress } = await supabase.from("progress").select("readiness").eq("user_id", userId).single();

    const { data: cert, error } = await supabase.from("certificates").insert({
      user_id: userId,
      display_name: profile?.display_name ?? "Pilot",
      final_score: Number(latest!.score),
      modules_completed: completions?.length ?? 0,
      hours_estimated: estHours,
    }).select("id").single();
    if (error) throw error;
    return { ok: true, id: cert!.id, readiness: progress?.readiness ?? 0 };
  });

// ============ CERTIFICATE REQUIREMENTS (status snapshot for UI) ============
export const getCertificateRequirementsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const cs = await getCertificateSettings();
    const flags = await getFeatureFlags();
    const minLatest = Number(cs.minLatestExamScore ?? 85);
    const requiredSims = Number(cs.requiredExamSimulations ?? 2);
    const minQuizAvg = Number(cs.minQuizAverage ?? 80);
    const minCoursePct = Number(cs.minCourseCompletionPercent ?? 100);

    const [{ data: sims }, { data: completions }, { count: lessonsTotal }, { data: attempts }] = await Promise.all([
      supabase.from("exam_simulations").select("score").eq("user_id", userId),
      supabase.from("lesson_completions").select("lesson_slug").eq("user_id", userId),
      supabase.from("lessons").select("*", { count: "exact", head: true }),
      supabase.from("quiz_attempts").select("score").eq("user_id", userId),
    ]);
    const latestPass = (sims ?? []).filter((s) => Number(s.score) >= minLatest).length;
    const quizAvg = attempts && attempts.length
      ? attempts.reduce((s: number, a: { score: number }) => s + Number(a.score), 0) / attempts.length
      : 0;
    const totalLessons = (lessonsTotal as number | null) ?? 0;
    const coursePct = totalLessons > 0 ? Math.round(((completions?.length ?? 0) / totalLessons) * 100) : 0;
    const bestSim = sims && sims.length ? Math.max(...sims.map((s) => Number(s.score))) : 0;

    return {
      enabled: !!flags.certificatesEnabled,
      requirements: {
        minLatestExamScore: minLatest,
        requiredExamSimulations: requiredSims,
        minQuizAverage: minQuizAvg,
        minCourseCompletionPercent: minCoursePct,
        estimatedHours: Number(cs.estimatedHours ?? 56),
        templateStyle: String(cs.templateStyle ?? "premium"),
      },
      progress: {
        bestSim: Math.round(bestSim),
        passingSims: latestPass,
        quizAvg: Math.round(quizAvg),
        coursePct,
      },
      meets: {
        latestExam: bestSim >= minLatest,
        sims: latestPass >= requiredSims,
        quizAvg: quizAvg >= minQuizAvg,
        course: coursePct >= minCoursePct,
      },
    };
  });

// ============ HELPERS ============
async function recomputeProgress(supabase: any, userId: string) {
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

  // XP is awarded incrementally by event-driven flows (lesson completion, lesson quiz pass).
  // Don't overwrite it here.
  await supabase.from("progress").update({
    study_pct: studyPct,
    practice_pct: practicePct,
    review_pct: reviewPct,
    readiness,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  await touchDailyActivity(supabase, userId);
}

// ============ STUDENT READINESS / TOPIC MASTERY ============
export const getStudentReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: lessons }, { data: attempts }, { data: sims }, { data: cards }] = await Promise.all([
      supabase.from("lesson_completions").select("id").eq("user_id", userId),
      supabase.from("quiz_attempts").select("score, finished_at").eq("user_id", userId),
      supabase.from("exam_simulations").select("score, finished_at").eq("user_id", userId).order("finished_at", { ascending: false }).limit(5),
      supabase.from("flashcards").select("repetitions, due_date").eq("user_id", userId),
    ]);
    const lessonsTotal = 28;
    const studyPct = Math.min(100, ((lessons?.length ?? 0) / lessonsTotal) * 100);
    const quizAvg = attempts && attempts.length ? attempts.reduce((s, a) => s + Number(a.score), 0) / attempts.length : 0;
    const bestSim = sims && sims.length ? Math.max(...sims.map((s) => Number(s.score))) : 0;
    const fcRetention = cards && cards.length
      ? (cards.filter((c) => (c.repetitions ?? 0) >= 2).length / cards.length) * 100
      : 0;
    const hasActivity = (lessons?.length ?? 0) + (attempts?.length ?? 0) + (sims?.length ?? 0) > 0;
    const activityPct = hasActivity ? 100 : 0;

    const score = Math.round(
      0.30 * studyPct +
      0.30 * quizAvg +
      0.25 * bestSim +
      0.10 * fcRetention +
      0.05 * activityPct
    );
    const { examReadyScore } = await getStudySettings();
    const ready = Number(examReadyScore ?? 85);
    const almost = Math.max(50, ready - 15);
    let status: "foundation" | "building" | "almost" | "ready";
    if (score < 50) status = "foundation";
    else if (score < almost) status = "building";
    else if (score < ready) status = "almost";
    else status = "ready";

    return {
      score,
      status,
      readyThreshold: ready,
      breakdown: {
        studyPct: Math.round(studyPct),
        quizAvg: Math.round(quizAvg),
        bestSim: Math.round(bestSim),
        fcRetention: Math.round(fcRetention),
      },
      counts: {
        lessons: lessons?.length ?? 0,
        attempts: attempts?.length ?? 0,
        sims: sims?.length ?? 0,
        flashcards: cards?.length ?? 0,
      },
    };
  });

export const getStudentTopicMastery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: attempts }, { data: answers }, { data: questions }] = await Promise.all([
      supabase.from("quiz_attempts").select("id, topic, score").eq("user_id", userId),
      supabase.from("quiz_answers").select("question_id, is_correct").eq("user_id", userId),
      supabase.from("questions").select("id, topic"),
    ]);
    const qById = new Map<string, string>();
    for (const q of questions ?? []) qById.set(q.id, (q.topic as string) ?? "unknown");

    const ansByTopic = new Map<string, { total: number; correct: number }>();
    for (const a of answers ?? []) {
      const t = qById.get(a.question_id) ?? "unknown";
      const cur = ansByTopic.get(t) ?? { total: 0, correct: 0 };
      cur.total += 1;
      if (a.is_correct) cur.correct += 1;
      ansByTopic.set(t, cur);
    }

    return TOPICS.map((topic) => {
      const tAttempts = (attempts ?? []).filter((a) => a.topic === topic);
      const avgScore = tAttempts.length ? tAttempts.reduce((s, a) => s + Number(a.score), 0) / tAttempts.length : 0;
      const ans = ansByTopic.get(topic) ?? { total: 0, correct: 0 };
      const correctRate = ans.total ? (ans.correct / ans.total) * 100 : 0;
      const mastery = ans.total >= 3 ? Math.round(correctRate) : Math.round(avgScore);
      let status: "weak" | "improving" | "strong";
      if (mastery >= 80) status = "strong";
      else if (mastery >= 60) status = "improving";
      else status = "weak";
      return {
        topic,
        attempts: tAttempts.length,
        averageScore: Math.round(avgScore),
        correctRate: Math.round(correctRate),
        totalAnswers: ans.total,
        mastery,
        status,
        hasData: ans.total > 0 || tAttempts.length > 0,
      };
    });
  });
