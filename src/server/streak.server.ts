// Daily activity / streak helper. Server-only.
// Supabase client is intentionally typed as any to keep this generic.

export async function touchDailyActivity(supabase: any, userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: prog } = await supabase
    .from("progress")
    .select("streak,last_activity_date")
    .eq("user_id", userId)
    .maybeSingle();

  const last = (prog?.last_activity_date as string | null) ?? null;

  if (last === today) return; // already counted today

  let streak = (prog?.streak as number | null) ?? 0;

  if (last) {
    const lastDate = new Date(last + "T00:00:00Z");
    const todayDate = new Date(today + "T00:00:00Z");
    const diff = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);

    if (diff === 1) {
      streak += 1;
    } else if (diff > 1) {
      streak = 1;
    } else {
      streak = streak || 1;
    }
  } else {
    streak = 1;
  }

  await supabase
    .from("progress")
    .update({ 
      streak, 
      last_activity_date: today, 
      updated_at: new Date().toISOString() 
    })
    .eq("user_id", userId);
}
