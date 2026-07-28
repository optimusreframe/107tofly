// Lab challenges (Map Lab, Weather Lab): log answers and award XP once per day per lab.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { touchDailyActivity } from "@/lib/streak.server";
import { addWeeklyXp } from "@/lib/leagues.server";

const LAB_XP = 10;

export const submitLabAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      labId: z.string().min(1).max(50),
      itemId: z.string().min(1).max(50),
      correct: z.boolean(),
      latencyMs: z.number().int().min(0).max(600_000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("session_events").insert({
      user_id: userId,
      kind: "answer",
      correct: data.correct,
      latency_ms: data.latencyMs ?? null,
      note: `lab:${data.labId}:${data.itemId}`,
    });
    return { ok: true };
  });

export const completeLabChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      labId: z.string().min(1).max(50),
      total: z.number().int().min(1).max(100),
      correct: z.number().int().min(0).max(100),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Idempotency: one XP grant per user per lab per UTC day.
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { data: prev } = await supabase
      .from("session_events")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "end")
      .eq("note", `lab:${data.labId}:end`)
      .gte("created_at", dayStart.toISOString())
      .limit(1);

    const alreadyCompleted = !!prev?.length;
    let xpAwarded = 0;

    if (!alreadyCompleted) {
      await supabase.from("session_events").insert({
        user_id: userId,
        kind: "end",
        correct: data.correct >= Math.ceil(data.total * 0.7),
        note: `lab:${data.labId}:end`,
      });
      await touchDailyActivity(supabase, userId);
      const { data: prog } = await supabase
        .from("progress").select("xp").eq("user_id", userId).maybeSingle();
      const newXp = Number(prog?.xp ?? 0) + LAB_XP;
      await supabase.from("progress")
        .update({ xp: newXp, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      xpAwarded = LAB_XP;
      await addWeeklyXp(supabase, userId, LAB_XP);
    }

    const score = Math.round((data.correct / data.total) * 100);
    return { score, xpAwarded, alreadyCompleted };
  });
