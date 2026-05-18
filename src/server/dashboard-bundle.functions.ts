import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStudySettings } from "./runtime-settings.server";
import type { ActivityItem } from "./student-settings.functions";

const TOPICS = ["regulations","airspace","sectional","weather","performance","operations","adm","emergencies","remote_id","maintenance"] as const;
type Topic = typeof TOPICS[number];

/**
 * Single consolidated server function that fetches EVERYTHING the dashboard needs
 * in one round trip, instead of 7+ separate serverFn calls.
 */
export const getDashboardBundle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const sinceIso = since.toISOString();

    const [
      profileRes,
      progressRes,
      dueRes,
      lessonsRes,
      completionsRes,
      quizProgressRes,
      attemptsRes,
      answersRes,
      questionsRes,
      simsRes,
      cardsRes,
      lcWeekRes,
      qaWeekRes,
      esWeekRes,
      // Recent activity feeds
      lcRecentRes,
      qaRecentRes,
      simsRecentRes,
      certsRecentRes,
      fcRecentRes,
    ] = await Promise.all([
      supabase.from("profiles").select("display_name,locale,preferred_language").eq("id", userId).maybeSingle(),
      supabase.from("progress").select("study_pct,practice_pct,review_pct,readiness,xp,streak").eq("user_id", userId).maybeSingle(),
      supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", userId).lte("due_date", today),
      supabase.from("lessons").select("slug,title,week,day,order_index,topic,est_minutes").eq("status","published").eq("locale","en").order("order_index", { ascending: true }),
      supabase.from("lesson_completions").select("lesson_slug,completed_at,topic").eq("user_id", userId).order("completed_at", { ascending: false }),
      supabase.from("lesson_quiz_progress").select("lesson_slug,best_score,passed").eq("user_id", userId),
      supabase.from("quiz_attempts").select("id,score,total,correct,topic,attempt_type,lesson_slug,finished_at,started_at").eq("user_id", userId).order("started_at", { ascending: false }),
      supabase.from("quiz_answers").select("question_id,is_correct").eq("user_id", userId),
      supabase.from("questions").select("id,topic"),
      supabase.from("exam_simulations").select("id,score,total,correct,finished_at,started_at").eq("user_id", userId).order("started_at", { ascending: false }),
      supabase.from("flashcards").select("repetitions").eq("user_id", userId),
      supabase.from("lesson_completions").select("completed_at").eq("user_id", userId).gte("completed_at", sinceIso),
      supabase.from("quiz_attempts").select("started_at").eq("user_id", userId).gte("started_at", sinceIso),
      supabase.from("exam_simulations").select("started_at").eq("user_id", userId).gte("started_at", sinceIso),
      supabase.from("lesson_completions").select("lesson_slug,completed_at,topic").eq("user_id", userId).order("completed_at", { ascending: false }).limit(10),
      supabase.from("quiz_attempts").select("id,score,total,correct,topic,attempt_type,lesson_slug,finished_at,started_at").eq("user_id", userId).order("started_at", { ascending: false }).limit(10),
      supabase.from("exam_simulations").select("id,score,total,correct,finished_at,started_at").eq("user_id", userId).order("started_at", { ascending: false }).limit(5),
      supabase.from("certificates").select("id,issued_at,final_score").eq("user_id", userId).order("issued_at", { ascending: false }).limit(3),
      supabase.from("flashcards").select("id,topic,last_reviewed_at").eq("user_id", userId).not("last_reviewed_at", "is", null).order("last_reviewed_at", { ascending: false }).limit(10),
    ]);

    // ---- Profile + progress ----
    const profile = profileRes.data ?? null;
    const progress = progressRes.data ?? null;
    const dueCount = dueRes.count ?? 0;

    // ---- Next lesson ----
    const lessons = lessonsRes.data ?? [];
    const completions = completionsRes.data ?? [];
    const quizProgress = quizProgressRes.data ?? [];
    const done = new Set(completions.map((c) => c.lesson_slug));
    const next = lessons.find((l) => !done.has(l.slug));
    let nextLesson;
    if (!next) {
      nextLesson = { allCompleted: true, lesson: null, totalLessons: lessons.length };
    } else {
      const qp = quizProgress.find((p) => p.lesson_slug === next.slug);
      nextLesson = {
        allCompleted: false,
        totalLessons: lessons.length,
        lesson: {
          slug: next.slug,
          title: next.title,
          week: next.week,
          day: next.day,
          order_index: next.order_index,
          topic: next.topic,
          est_minutes: next.est_minutes,
          quiz_best_score: qp?.best_score ?? null,
          quiz_passed: qp?.passed ?? false,
        },
      };
    }

    // ---- Readiness ----
    const attempts = attemptsRes.data ?? [];
    const sims = simsRes.data ?? [];
    const cards = cardsRes.data ?? [];
    const lessonsTotal = 28;
    const studyPct = Math.min(100, ((completions.length) / lessonsTotal) * 100);
    const quizAvg = attempts.length ? attempts.reduce((s, a) => s + Number(a.score), 0) / attempts.length : 0;
    const bestSim = sims.length ? Math.max(...sims.map((s) => Number(s.score))) : 0;
    const fcRetention = cards.length
      ? (cards.filter((c) => (c.repetitions ?? 0) >= 2).length / cards.length) * 100
      : 0;
    const hasActivity = completions.length + attempts.length + sims.length > 0;
    const activityPct = hasActivity ? 100 : 0;
    const readinessScore = Math.round(
      0.30 * studyPct + 0.30 * quizAvg + 0.25 * bestSim + 0.10 * fcRetention + 0.05 * activityPct
    );
    const { examReadyScore } = await getStudySettings();
    const readyThreshold = Number(examReadyScore ?? 85);
    const almost = Math.max(50, readyThreshold - 15);
    let readinessStatus: "foundation" | "building" | "almost" | "ready";
    if (readinessScore < 50) readinessStatus = "foundation";
    else if (readinessScore < almost) readinessStatus = "building";
    else if (readinessScore < readyThreshold) readinessStatus = "almost";
    else readinessStatus = "ready";

    const readiness = {
      score: readinessScore,
      status: readinessStatus,
      readyThreshold,
      breakdown: {
        studyPct: Math.round(studyPct),
        quizAvg: Math.round(quizAvg),
        bestSim: Math.round(bestSim),
        fcRetention: Math.round(fcRetention),
      },
    };

    // ---- Topic mastery ----
    const answers = answersRes.data ?? [];
    const questions = questionsRes.data ?? [];
    const qById = new Map<string, string>();
    for (const q of questions) qById.set(q.id, (q.topic as string) ?? "unknown");
    const ansByTopic = new Map<string, { total: number; correct: number }>();
    for (const a of answers) {
      const tp = qById.get(a.question_id) ?? "unknown";
      const cur = ansByTopic.get(tp) ?? { total: 0, correct: 0 };
      cur.total += 1;
      if (a.is_correct) cur.correct += 1;
      ansByTopic.set(tp, cur);
    }
    const mastery = TOPICS.map((topic) => {
      const tAttempts = attempts.filter((a) => a.topic === topic);
      const avgScore = tAttempts.length ? tAttempts.reduce((s, a) => s + Number(a.score), 0) / tAttempts.length : 0;
      const ans = ansByTopic.get(topic) ?? { total: 0, correct: 0 };
      const correctRate = ans.total ? (ans.correct / ans.total) * 100 : 0;
      const m = ans.total >= 3 ? Math.round(correctRate) : Math.round(avgScore);
      let status: "weak" | "improving" | "strong";
      if (m >= 80) status = "strong";
      else if (m >= 60) status = "improving";
      else status = "weak";
      return {
        topic: topic as Topic,
        attempts: tAttempts.length,
        averageScore: Math.round(avgScore),
        correctRate: Math.round(correctRate),
        totalAnswers: ans.total,
        mastery: m,
        status,
        hasData: ans.total > 0 || tAttempts.length > 0,
      };
    });

    // ---- 7-day activity buckets ----
    const counts = new Array(7).fill(0) as number[];
    const sinceTs = since.getTime();
    const bucket = (iso?: string | null) => {
      if (!iso) return;
      const d = new Date(iso);
      d.setHours(0, 0, 0, 0);
      const idx = Math.round((d.getTime() - sinceTs) / (1000 * 60 * 60 * 24));
      if (idx >= 0 && idx < 7) counts[idx] += 1;
    };
    (lcWeekRes.data ?? []).forEach((r) => bucket(r.completed_at));
    (qaWeekRes.data ?? []).forEach((r) => bucket(r.started_at));
    (esWeekRes.data ?? []).forEach((r) => bucket(r.started_at));

    // ---- Recent activity feed ----
    const items: ActivityItem[] = [];
    for (const r of lcRecentRes.data ?? []) {
      items.push({ type: "lesson_completed", title: r.lesson_slug, subtitle: r.topic ?? undefined, created_at: r.completed_at, href: `/lessons/${r.lesson_slug}` });
    }
    for (const r of qaRecentRes.data ?? []) {
      const ts = r.finished_at ?? r.started_at;
      items.push({ type: "quiz_attempt", title: `${Math.round(Number(r.score))}%`, subtitle: `${r.correct}/${r.total} · ${r.topic ?? r.attempt_type ?? "practice"}`, created_at: ts, href: r.lesson_slug ? `/lessons/${r.lesson_slug}` : "/practice" });
    }
    for (const r of simsRecentRes.data ?? []) {
      const ts = r.finished_at ?? r.started_at;
      items.push({ type: "exam_simulation", title: `${Math.round(Number(r.score))}%`, subtitle: `${r.correct}/${r.total}`, created_at: ts, href: "/simulator" });
    }
    for (const r of certsRecentRes.data ?? []) {
      items.push({ type: "certificate_issued", title: `${Math.round(Number(r.final_score))}%`, created_at: r.issued_at, href: "/certificate" });
    }
    const fcByDay = new Map<string, number>();
    for (const r of fcRecentRes.data ?? []) {
      if (!r.last_reviewed_at) continue;
      const day = r.last_reviewed_at.slice(0, 10);
      fcByDay.set(day, (fcByDay.get(day) ?? 0) + 1);
    }
    for (const [day, n] of fcByDay) {
      items.push({ type: "flashcard_review", title: `${n}`, created_at: `${day}T12:00:00Z`, href: "/flashcards" });
    }
    items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const recentActivity = items.slice(0, 5);

    return {
      profile,
      progress,
      dueCount,
      nextLesson,
      readiness,
      mastery,
      weeklyActivity: counts,
      recentActivity,
    };
  });

export type DashboardBundle = Awaited<ReturnType<typeof getDashboardBundle>>;
