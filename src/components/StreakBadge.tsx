import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Compact streak indicator. Reads progress.streak via RLS (own row only).
 * Re-fetches when the auth user changes; cheap single-row query.
 */
export function StreakBadge({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setStreak(null);
      return;
    }
    supabase
      .from("progress")
      .select("streak")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setStreak((data?.streak as number | null) ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (streak === null) return null;

  const label = t("student.streakDays", { n: streak });

  return (
    <div
      aria-label={label}
      title={label}
      className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-card/60 px-2.5 text-xs font-medium"
    >
      <Flame
        className={`h-3.5 w-3.5 ${streak > 0 ? "text-warning" : "text-muted-foreground"}`}
        strokeWidth={2.25}
      />
      <span className={streak > 0 ? "text-foreground" : "text-muted-foreground"}>
        {streak}
      </span>
      {!compact && <span className="text-muted-foreground">{t("student.streakUnit", { defaultValue: "d" })}</span>}
    </div>
  );
}
