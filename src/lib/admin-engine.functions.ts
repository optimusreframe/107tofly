import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EngineMetrics = {
  totalUnits: number;
  publishedUnits: number;
  totalConcepts: number;
  totalExercises: number;
  totalMasteryRows: number;
  masteredConcepts: number;
  activeLearners7d: number;
  answers7d: number;
  correctRate7d: number;
  feedbackOpen: number;
  topReported: Array<{ exerciseId: string; count: number; kind: string | null; conceptTitle: string | null }>;
};

export const getEngineMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EngineMetrics> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

    const [
      unitsAll,
      unitsPub,
      conceptsCnt,
      exercisesCnt,
      masteryCnt,
      masteredCnt,
      answers7,
      correct7,
      active7,
      feedbackAll,
      topRep,
    ] = await Promise.all([
      supabaseAdmin.from("learning_units").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("learning_units").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabaseAdmin.from("concepts").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("exercises").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("mastery").select("user_id", { count: "exact", head: true }),
      supabaseAdmin.from("mastery").select("user_id", { count: "exact", head: true }).gte("level", 5),
      supabaseAdmin.from("session_events").select("id", { count: "exact", head: true }).eq("kind", "answer").gte("created_at", since7),
      supabaseAdmin.from("session_events").select("id", { count: "exact", head: true }).eq("kind", "answer").eq("correct", true).gte("created_at", since7),
      supabaseAdmin.from("session_events").select("user_id").eq("kind", "answer").gte("created_at", since7),
      supabaseAdmin.from("session_events").select("id", { count: "exact", head: true }).eq("kind", "feedback"),
      supabaseAdmin
        .from("session_events")
        .select("exercise_id, exercises(kind, concepts(title))")
        .eq("kind", "feedback")
        .not("exercise_id", "is", null)
        .limit(500),
    ]);

    const activeSet = new Set<string>();
    for (const r of active7.data ?? []) activeSet.add(r.user_id as string);

    // Aggregate top reported exercises client-side (worker).
    const counts = new Map<string, { count: number; kind: string | null; conceptTitle: string | null }>();
    for (const r of topRep.data ?? []) {
      const id = r.exercise_id as string;
      if (!id) continue;
      const ex = (r as any).exercises as { kind?: string; concepts?: { title?: string } } | null;
      const cur = counts.get(id) ?? { count: 0, kind: ex?.kind ?? null, conceptTitle: ex?.concepts?.title ?? null };
      cur.count += 1;
      counts.set(id, cur);
    }
    const topReported = Array.from(counts.entries())
      .map(([exerciseId, v]) => ({ exerciseId, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const answers = answers7.count ?? 0;
    const correct = correct7.count ?? 0;

    return {
      totalUnits: unitsAll.count ?? 0,
      publishedUnits: unitsPub.count ?? 0,
      totalConcepts: conceptsCnt.count ?? 0,
      totalExercises: exercisesCnt.count ?? 0,
      totalMasteryRows: masteryCnt.count ?? 0,
      masteredConcepts: masteredCnt.count ?? 0,
      activeLearners7d: activeSet.size,
      answers7d: answers,
      correctRate7d: answers > 0 ? Math.round((correct / answers) * 100) : 0,
      feedbackOpen: feedbackAll.count ?? 0,
      topReported,
    };
  });
