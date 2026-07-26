import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useAuth } from "@/hooks/use-auth";
import { getMasteryOverview, type UnitMastery } from "@/lib/mastery-overview.functions";
import { CheckCircle2, Clock, Sparkles, ArrowRight, Circle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "My Progress — 107toFly" },
      { name: "description", content: "Concept mastery across all learning units, with due reviews and streaks." },
    ],
  }),
  component: ProgressPage,
});

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = 60_000, hr = 60 * min, day = 24 * hr;
  const rel = (n: number, u: string) => `${n}${u}`;
  const val = abs < hr ? rel(Math.max(1, Math.round(abs / min)), "m")
    : abs < day ? rel(Math.round(abs / hr), "h")
    : rel(Math.round(abs / day), "d");
  return diff < 0 ? `${val} ago` : `in ${val}`;
}

function StatusDot({ status }: { status: "new" | "due" | "learning" | "mastered" }) {
  const cls = status === "mastered" ? "bg-success"
    : status === "due" ? "bg-warning"
    : status === "learning" ? "bg-primary"
    : "bg-muted-foreground/40";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function ProgressPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fetchOverview = useServerFn(getMasteryOverview);
  const [data, setData] = useState<{ units: UnitMastery[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchOverview()
      .then((r) => { if (!cancelled) setData(r); })
      .catch((e: unknown) => {
        if (cancelled) return;
        // Session player disabled or unauthorized → show empty state gracefully.
        setErr(e instanceof Error ? e.message : "unavailable");
        setData({ units: [] });
      });
    return () => { cancelled = true; };
  }, [user, fetchOverview]);

  if (loading || !user || !data) {
    return (
      <StudentAppShell>
        <div className="mx-auto max-w-5xl px-6 pt-16">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
          </div>
        </div>
      </StudentAppShell>
    );
  }

  const totalDue = data.units.reduce((s, u) => s + u.dueCount, 0);
  const totalMastered = data.units.reduce((s, u) => s + u.masteredCount, 0);
  const totalConcepts = data.units.reduce((s, u) => s + u.conceptCount, 0);

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-5xl px-6 pt-12 md:pt-16 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">{t("student.dashboard.myProgress")}</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Concept mastery</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1.5 text-sm font-medium text-warning">
              <Clock className="h-4 w-4" /> {totalDue} due
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> {totalMastered}/{totalConcepts} mastered
            </span>
          </div>
        </div>

        {data.units.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {err ? "Adaptive learning is not enabled yet." : "No learning units published yet."}
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {data.units.map((u) => (
              <div key={u.id} className="glass rounded-3xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">{u.title}</h2>
                    {u.summary && <p className="mt-1 text-sm text-muted-foreground">{u.summary}</p>}
                  </div>
                  <Link
                    to="/learn/$unitSlug"
                    params={{ unitSlug: u.slug }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {u.dueCount > 0 ? `Review ${u.dueCount}` : u.seenCount === 0 ? "Start" : "Practice"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-[var(--gradient-sky)]" style={{ width: `${u.avgMasteryPct}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">
                    {u.avgMasteryPct}% avg
                  </span>
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {u.masteredCount} mastered · {u.dueCount} due · {u.seenCount}/{u.conceptCount} seen
                </div>

                <ul className="mt-4 divide-y divide-border/40">
                  {u.concepts.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-2.5">
                      <StatusDot status={c.status} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.status === "new" ? "Not started"
                            : c.status === "due" ? `Due ${fmtRelative(c.nextDueAt)}`
                            : c.status === "mastered" ? "Mastered"
                            : `Next review ${fmtRelative(c.nextDueAt)}`}
                          {c.correctStreak > 0 && ` · streak ${c.correctStreak}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1" aria-label={`level ${c.level} of ${c.maxLevel}`}>
                        {Array.from({ length: c.maxLevel }).map((_, i) => (
                          <Circle
                            key={i}
                            className={`h-2 w-2 ${i < c.level ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                      <div className="w-10 text-right text-xs tabular-nums text-muted-foreground">{c.masteryPct}%</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </StudentAppShell>
  );
}
