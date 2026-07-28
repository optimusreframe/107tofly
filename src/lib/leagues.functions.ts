import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isoWeekStart } from "./leagues.server";

export const getWeeklyLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const week = isoWeekStart();
    const { data: rows } = await supabase
      .from("weekly_xp")
      .select("user_id, xp, tier")
      .eq("week_start", week)
      .order("xp", { ascending: false })
      .limit(100);
    const list = rows ?? [];
    const ids = list.map((r: any) => r.user_id);
    let profiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles").select("id, display_name, avatar_url").in("id", ids);
      for (const p of profs ?? []) profiles[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
    }
    const entries = list.map((r: any, i: number) => ({
      rank: i + 1,
      userId: r.user_id,
      xp: Number(r.xp),
      tier: r.tier,
      displayName: profiles[r.user_id]?.display_name ?? "Pilot",
      avatarUrl: profiles[r.user_id]?.avatar_url ?? null,
      isMe: r.user_id === userId,
    }));
    const myEntry = entries.find((e) => e.isMe) ?? null;
    return { weekStart: week, entries, myEntry };
  });
