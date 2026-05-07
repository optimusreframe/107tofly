import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getStudentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name,locale,preferred_language,preferred_theme,target_exam_date,study_plan,daily_goal_minutes,experience_level,study_goal_date")
      .eq("id", userId)
      .maybeSingle();
    const { data: progress } = await supabase
      .from("progress")
      .select("xp,streak,readiness,last_activity_date")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      email: context.claims?.email ?? null,
      profile: profile ?? null,
      progress: progress ?? null,
    };
  });

export const updateStudentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      display_name: z.string().min(1).max(80).optional(),
      preferred_language: z.enum(["en", "es"]).optional(),
      preferred_theme: z.enum(["light", "dark", "system"]).optional(),
      target_exam_date: z.string().nullable().optional(),
      study_plan: z.enum(["4-week", "intensive", "flexible"]).optional(),
      daily_goal_minutes: z.number().min(15).max(480).optional(),
    }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.display_name !== undefined) patch.display_name = data.display_name;
    if (data.preferred_language !== undefined) {
      patch.preferred_language = data.preferred_language;
      patch.locale = data.preferred_language;
    }
    if (data.preferred_theme !== undefined) patch.preferred_theme = data.preferred_theme;
    if (data.target_exam_date !== undefined) {
      patch.target_exam_date = data.target_exam_date || null;
      patch.study_goal_date = data.target_exam_date || null;
    }
    if (data.study_plan !== undefined) patch.study_plan = data.study_plan;
    if (data.daily_goal_minutes !== undefined) patch.daily_goal_minutes = data.daily_goal_minutes;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const resetMyProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ confirm: z.literal("RESET") }).parse(d))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await Promise.all([
      supabase.from("lesson_completions").delete().eq("user_id", userId),
      supabase.from("lesson_quiz_progress").delete().eq("user_id", userId),
      supabase.from("quiz_answers").delete().eq("user_id", userId),
      supabase.from("quiz_attempts").delete().eq("user_id", userId),
      supabase.from("exam_simulations").delete().eq("user_id", userId),
      supabase.from("flashcards").delete().eq("user_id", userId),
    ]);
    await supabase.from("progress").update({
      study_pct: 0, practice_pct: 0, review_pct: 0,
      readiness: 0, xp: 0, streak: 0,
      last_activity_date: null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    return { ok: true };
  });

export const getNextLesson = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: lessons }, { data: completions }, { data: quizProgress }] = await Promise.all([
      supabase
        .from("lessons")
        .select("slug,title,week,day,order_index,topic,est_minutes")
        .eq("status", "published")
        .eq("locale", "en")
        .order("order_index", { ascending: true }),
      supabase.from("lesson_completions").select("lesson_slug").eq("user_id", userId),
      supabase.from("lesson_quiz_progress").select("lesson_slug,best_score,passed").eq("user_id", userId),
    ]);
    const done = new Set((completions ?? []).map((c) => c.lesson_slug));
    const next = (lessons ?? []).find((l) => !done.has(l.slug));
    if (!next) {
      return { allCompleted: true, lesson: null, totalLessons: lessons?.length ?? 0 };
    }
    const qp = (quizProgress ?? []).find((p) => p.lesson_slug === next.slug);
    return {
      allCompleted: false,
      totalLessons: lessons?.length ?? 0,
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
  });

export type ActivityItem = {
  type: "lesson_completed" | "quiz_attempt" | "exam_simulation" | "certificate_issued" | "flashcard_review";
  title: string;
  subtitle?: string;
  created_at: string;
  href?: string;
};

export const getStudentRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivityItem[]> => {
    const { supabase, userId } = context;
    const [lc, qa, sims, certs, fc] = await Promise.all([
      supabase.from("lesson_completions").select("lesson_slug,completed_at,topic").eq("user_id", userId).order("completed_at", { ascending: false }).limit(10),
      supabase.from("quiz_attempts").select("id,score,total,correct,topic,attempt_type,lesson_slug,finished_at,started_at").eq("user_id", userId).order("started_at", { ascending: false }).limit(10),
      supabase.from("exam_simulations").select("id,score,total,correct,finished_at,started_at").eq("user_id", userId).order("started_at", { ascending: false }).limit(5),
      supabase.from("certificates").select("id,issued_at,final_score").eq("user_id", userId).order("issued_at", { ascending: false }).limit(3),
      supabase.from("flashcards").select("id,topic,last_reviewed_at").eq("user_id", userId).not("last_reviewed_at", "is", null).order("last_reviewed_at", { ascending: false }).limit(10),
    ]);
    const items: ActivityItem[] = [];
    for (const r of lc.data ?? []) {
      items.push({
        type: "lesson_completed",
        title: r.lesson_slug,
        subtitle: r.topic ?? undefined,
        created_at: r.completed_at,
        href: `/lessons/${r.lesson_slug}`,
      });
    }
    for (const r of qa.data ?? []) {
      const ts = r.finished_at ?? r.started_at;
      items.push({
        type: "quiz_attempt",
        title: `${Math.round(Number(r.score))}%`,
        subtitle: `${r.correct}/${r.total} · ${r.topic ?? r.attempt_type ?? "practice"}`,
        created_at: ts,
        href: r.lesson_slug ? `/lessons/${r.lesson_slug}` : "/practice",
      });
    }
    for (const r of sims.data ?? []) {
      const ts = r.finished_at ?? r.started_at;
      items.push({
        type: "exam_simulation",
        title: `${Math.round(Number(r.score))}%`,
        subtitle: `${r.correct}/${r.total}`,
        created_at: ts,
        href: "/simulator",
      });
    }
    for (const r of certs.data ?? []) {
      items.push({
        type: "certificate_issued",
        title: `${Math.round(Number(r.final_score))}%`,
        created_at: r.issued_at,
        href: "/certificate",
      });
    }
    // Group flashcard reviews by day to avoid noise
    const fcByDay = new Map<string, number>();
    for (const r of fc.data ?? []) {
      if (!r.last_reviewed_at) continue;
      const day = r.last_reviewed_at.slice(0, 10);
      fcByDay.set(day, (fcByDay.get(day) ?? 0) + 1);
    }
    for (const [day, n] of fcByDay) {
      items.push({
        type: "flashcard_review",
        title: `${n}`,
        created_at: `${day}T12:00:00Z`,
        href: "/flashcards",
      });
    }
    items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return items.slice(0, 5);
  });
