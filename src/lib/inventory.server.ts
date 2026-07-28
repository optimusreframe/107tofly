// Server-only helpers for the economy/inventory subsystem.
// Never imported directly from client components.

export async function computeXpMultipliers(
  supabase: any,
  userId: string,
  baseXp: number,
  answersInOrder: Array<{ correct: boolean | null }>
): Promise<{ finalXp: number; comboBonus: number; boostActive: boolean; maxCombo: number }> {
  let cur = 0, maxCombo = 0;
  for (const a of answersInOrder) {
    if (a.correct === true) { cur++; if (cur > maxCombo) maxCombo = cur; }
    else cur = 0;
  }
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
