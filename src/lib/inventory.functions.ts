import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InventoryItem = { itemKey: string; quantity: number; activeUntil: string | null };

export const getInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_inventory")
      .select("item_key,quantity,active_until")
      .eq("user_id", userId);
    const items: InventoryItem[] = (data ?? []).map((r: any) => ({
      itemKey: r.item_key,
      quantity: Number(r.quantity ?? 0),
      activeUntil: r.active_until ?? null,
    }));
    const boost = items.find((i) => i.itemKey === "xp_boost");
    const boostActive = !!(boost?.activeUntil && new Date(boost.activeUntil).getTime() > Date.now());
    return { items, boostActive, boostActiveUntil: boost?.activeUntil ?? null };
  });

export const activateXpBoost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("user_inventory")
      .select("quantity,active_until")
      .eq("user_id", userId)
      .eq("item_key", "xp_boost")
      .maybeSingle();
    const nowMs = Date.now();
    if (row?.active_until && new Date(row.active_until as string).getTime() > nowMs) {
      return { ok: true, activeUntil: row.active_until, alreadyActive: true };
    }
    const qty = Number(row?.quantity ?? 0);
    if (qty < 1) throw new Response("No XP Boost available", { status: 400 });
    const activeUntil = new Date(nowMs + 30 * 60_000).toISOString();
    const { error } = await supabase
      .from("user_inventory")
      .update({ quantity: qty - 1, active_until: activeUntil, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("item_key", "xp_boost");
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true, activeUntil, alreadyActive: false };
  });

export const useStreakFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("user_inventory")
      .select("quantity")
      .eq("user_id", userId)
      .eq("item_key", "streak_freeze")
      .maybeSingle();
    const qty = Number(row?.quantity ?? 0);
    if (qty < 1) throw new Response("No Streak Freeze available", { status: 400 });
    // Bump streak preservation flag by touching last_activity_date to yesterday if today missed.
    const { data: prog } = await supabase.from("progress").select("last_activity_date,streak").eq("user_id", userId).maybeSingle();
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const todayIso = today.toISOString().slice(0, 10);
    const last = prog?.last_activity_date as string | null;
    const yesterday = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
    if (last === todayIso) {
      return { ok: true, note: "Streak already safe for today" };
    }
    await supabase.from("progress")
      .update({ last_activity_date: yesterday, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    await supabase.from("user_inventory")
      .update({ quantity: qty - 1, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("item_key", "streak_freeze");
    return { ok: true };
  });

// Server helper — called from endSession to apply combo + boost multipliers.
// Not a server fn; imported by session-player.functions.ts.
export async function computeXpMultipliers(
  supabase: any,
  userId: string,
  baseXp: number,
  answersInOrder: Array<{ correct: boolean | null }>
): Promise<{ finalXp: number; comboBonus: number; boostActive: boolean; maxCombo: number }> {
  // Combo: max consecutive-correct streak within session.
  let cur = 0, maxCombo = 0;
  for (const a of answersInOrder) {
    if (a.correct === true) { cur++; if (cur > maxCombo) maxCombo = cur; }
    else cur = 0;
  }
  // Combo bonus: +10% for combo ≥3, +25% for ≥5, +50% for ≥8.
  const comboMult = maxCombo >= 8 ? 1.5 : maxCombo >= 5 ? 1.25 : maxCombo >= 3 ? 1.1 : 1.0;

  const { data: boostRow } = await supabase
    .from("user_inventory")
    .select("active_until")
    .eq("user_id", userId)
    .eq("item_key", "xp_boost")
    .maybeSingle();
  const boostActive = !!(boostRow?.active_until && new Date(boostRow.active_until).getTime() > Date.now());
  const boostMult = boostActive ? 2 : 1;

  const final = Math.round(baseXp * comboMult * boostMult);
  const comboBonus = Math.round(baseXp * (comboMult - 1));
  return { finalXp: final, comboBonus, boostActive, maxCombo };
}
