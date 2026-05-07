import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: lessons, error }, { data: completions }] = await Promise.all([
      supabase
        .from("lessons")
        .select("slug,title,summary,week,day,order_index,topic,est_minutes,status")
        .eq("status", "published")
        .order("order_index", { ascending: true }),
      supabase
        .from("lesson_completions")
        .select("lesson_slug")
        .eq("user_id", userId),
    ]);
    if (error) throw error;
    const done = new Set((completions ?? []).map((c) => c.lesson_slug));
    return (lessons ?? []).map((l) => ({ ...l, completed: done.has(l.slug) }));
  });

export const getLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("slug,title,summary,body_md,week,day,order_index,topic,est_minutes,sources")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw error;
    if (!lesson) return { lesson: null, completed: false };
    const { data: completion } = await supabase
      .from("lesson_completions")
      .select("lesson_slug")
      .eq("user_id", userId)
      .eq("lesson_slug", data.slug)
      .maybeSingle();
    return { lesson, completed: !!completion };
  });

export const getAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [
      { data: progress },
      { data: completions },
      { count: lessonsTotal },
      { data: attempts },
      { data: sims },
    ] = await Promise.all([
      supabase.from("progress").select("xp,streak,readiness").eq("user_id", userId).maybeSingle(),
      supabase.from("lesson_completions").select("lesson_slug,topic").eq("user_id", userId),
      supabase.from("lessons").select("*", { count: "exact", head: true }),
      supabase.from("quiz_attempts").select("topic,score,correct,total").eq("user_id", userId),
      supabase.from("exam_simulations").select("score").eq("user_id", userId),
    ]);

    const xp = progress?.xp ?? 0;
    const streak = progress?.streak ?? 0;
    const lessonsDone = completions?.length ?? 0;
    const completionsByTopic = new Set((completions ?? []).map((c) => c.topic));
    const bestByTopic: Record<string, number> = {};
    for (const a of attempts ?? []) {
      if (!a.topic) continue;
      const s = Number(a.score);
      if (!bestByTopic[a.topic] || s > bestByTopic[a.topic]) bestByTopic[a.topic] = s;
    }
    const perfectQuiz = (attempts ?? []).some((a) => Number(a.score) === 100);
    const simsPassed = (sims ?? []).filter((s) => Number(s.score) >= 85).length;

    const badges = [
      { id: "first_takeoff", name: "First Takeoff", desc: "Primera lección completada", got: lessonsDone >= 1 },
      { id: "chart_navigator", name: "Chart Navigator", desc: "80%+ en sectional charts", got: (bestByTopic["sectional"] ?? 0) >= 80 },
      { id: "weather_decoder", name: "Weather Decoder", desc: "80%+ en METAR/TAF", got: (bestByTopic["weather"] ?? 0) >= 80 },
      { id: "safety_first", name: "Safety First", desc: "Lecciones de ADM y emergencias completadas", got: completionsByTopic.has("adm") && completionsByTopic.has("emergencies") },
      { id: "exam_ready", name: "Exam Ready", desc: "Dos simulacros sobre 85%", got: simsPassed >= 2 },
      { id: "perfect_flight", name: "Perfect Flight", desc: "Quiz al 100%", got: perfectQuiz },
      { id: "half_course", name: "Halfway There", desc: "50% del plan 28 días", got: lessonsTotal ? lessonsDone >= Math.ceil((lessonsTotal as number) / 2) : false },
      { id: "streak_30", name: "30-Day Streak", desc: "Estudio 30 días consecutivos", got: streak >= 30 },
    ];

    const levels = [
      "Ground School Starter",
      "Drone Cadet",
      "Airspace Explorer",
      "Weather Reader",
      "Mission Planner",
      "Remote PIC Ready",
      "Exam Ready Pilot",
    ];
    const levelStep = 400;
    const levelIdx = Math.min(levels.length - 1, Math.floor(xp / levelStep));
    const nextXp = (levelIdx + 1) * levelStep;

    return {
      xp,
      streak,
      lessonsDone,
      lessonsTotal: lessonsTotal ?? 0,
      badges,
      levels,
      currentLevel: levelIdx,
      nextXp,
    };
  });
