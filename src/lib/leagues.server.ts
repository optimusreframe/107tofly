// Server-only helpers for weekly leagues.

export function isoWeekStart(d: Date = new Date()): string {
  // Monday of the current UTC week, YYYY-MM-DD.
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setUTCHours(0, 0, 0, 0);
  mon.setUTCDate(mon.getUTCDate() + diff);
  return mon.toISOString().slice(0, 10);
}

export function tierForXp(xp: number): string {
  if (xp >= 2000) return "ace";
  if (xp >= 1000) return "diamond";
  if (xp >= 500) return "gold";
  if (xp >= 200) return "silver";
  return "bronze";
}

export async function addWeeklyXp(supabase: any, userId: string, amount: number) {
  if (amount <= 0) return;
  const week = isoWeekStart();
  const { data: row } = await supabase
    .from("weekly_xp")
    .select("xp")
    .eq("user_id", userId)
    .eq("week_start", week)
    .maybeSingle();
  const next = Number(row?.xp ?? 0) + amount;
  const tier = tierForXp(next);
  if (row) {
    await supabase.from("weekly_xp")
      .update({ xp: next, tier, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("week_start", week);
  } else {
    await supabase.from("weekly_xp").insert({ user_id: userId, week_start: week, xp: next, tier });
  }
}
