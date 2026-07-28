import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useAuth } from "@/hooks/use-auth";
import { getDashboardBundle, type DashboardBundle } from "@/lib/dashboard-bundle.functions";
import type { ActivityItem } from "@/lib/student-settings.functions";
import {
  Flame,
  Sparkles,
  Trophy,
  Clock,
  TrendingUp,
  ArrowRight,
  PlayCircle,
  Brain,
  Target,
  CheckCircle2,
  GraduationCap,
  Award,
} from "lucide-react";

type Mastery = DashboardBundle["mastery"];
type Readiness = DashboardBundle["readiness"];
type NextLesson = DashboardBundle["nextLesson"];

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — 107toFly" },
      { name: "description", content: "Tu progreso, readiness score y próxima lección recomendada." },
    ],
  }),
  component: Dashboard,
});

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function Ring({ value, color, size = 110 }: { value: number; color: string; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={8} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={off}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
    </svg>
  );
}

interface ProgressRow {
  study_pct: number;
  practice_pct: number;
  review_pct: number;
  readiness: number;
  xp: number;
  streak: number;
}

function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fetchBundle = useServerFn(getDashboardBundle);
  const [bundle, setBundle] = useState<DashboardBundle | null>(null);
  const [bundleError, setBundleError] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchBundle()
      .then((b) => {
        if (!cancelled) setBundle(b);
      })
      .catch(() => {
        if (!cancelled) setBundleError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, fetchBundle]);

  const progress = (bundle?.progress ?? null) as ProgressRow | null;
  const name = bundle?.profile?.display_name ?? "Pilot";
  const dueCount = bundle?.dueCount ?? null;
  const activity = bundle?.weeklyActivity ?? null;
  const readinessData: Readiness | null = bundle?.readiness ?? null;
  const mastery: Mastery | null = bundle?.mastery ?? null;
  const nextLesson: NextLesson | null = bundle?.nextLesson ?? null;
  const recent: ActivityItem[] | null = bundle?.recentActivity ?? null;

  const readiness = readinessData?.score ?? progress?.readiness ?? 0;
  const readinessStatusKey = readinessData?.status ?? (readiness >= 85 ? "ready" : readiness >= 70 ? "almost" : readiness >= 50 ? "building" : "foundation");
  const ringValues = [
    { label: t("student.dashboard.study"), value: progress?.study_pct ?? 0, color: "oklch(0.62 0.2 255)" },
    { label: t("student.dashboard.practice"), value: progress?.practice_pct ?? 0, color: "oklch(0.7 0.16 235)" },
    { label: t("student.dashboard.review"), value: progress?.review_pct ?? 0, color: "oklch(0.68 0.16 155)" },
  ];

  if (loading || !user || (!bundle && !bundleError)) {
    return (
      <StudentAppShell>
        <DashboardSkeleton />
      </StudentAppShell>
    );
  }

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-6xl px-6 pt-12 md:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">{t("student.dashboard.hello", { name })}</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">
              {t("student.dashboard.myProgress")} · <span className="text-gradient">{t("student.dashboard.keepFlying")}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1.5 text-sm font-medium text-warning-foreground">
              <Flame className="h-4 w-4 text-warning" /> {t("student.streakDays", { n: progress?.streak ?? 0 })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary">
              <Trophy className="h-4 w-4" /> {progress?.xp ?? 0} XP
            </span>
          </div>
        </div>

        {/* Top grid */}
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {/* Readiness */}
          <div className="glass-strong rounded-3xl p-6 shadow-glass lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("student.dashboard.readinessScore")}</div>
                <div className="mt-1 font-display text-5xl font-semibold">
                  {readiness}<span className="text-xl text-muted-foreground">/100</span>
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-success">
                  <TrendingUp className="h-4 w-4" /> {t(`student.${readinessStatusKey}`)}
                </div>
              </div>
              <div className="flex gap-2">
                {ringValues.map((r) => (
                  <div key={r.label} className="relative grid place-items-center">
                    <Ring value={r.value} color={r.color} size={88} />
                    <div className="absolute text-center">
                      <div className="font-display text-sm font-semibold">{r.value}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Topic mastery (real data) */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("student.topicMastery")}</div>
                {mastery && mastery.some((m) => m.status === "weak" && m.hasData) && (
                  <Link to="/practice" search={{ mode: "weak" } as never} className="text-xs font-medium text-primary hover:underline">
                    {t("student.practiceWeak")} →
                  </Link>
                )}
              </div>
              {!mastery ? (
                <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
              ) : mastery.every((m) => !m.hasData) ? (
                <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  {t("student.masteryEmpty")}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {mastery.filter((m) => m.hasData).slice(0, 4).map((m) => (
                    <div key={m.topic} className="rounded-2xl border border-border bg-card/60 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t(`student.topics.${m.topic}`, { defaultValue: m.topic })}
                      </div>
                      <div className="font-display text-lg font-semibold">{m.mastery}%</div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-[var(--gradient-sky)]" style={{ width: `${m.mastery}%` }} />
                      </div>
                      <div className={`mt-1 text-[10px] font-medium ${m.status === "strong" ? "text-success" : m.status === "weak" ? "text-destructive" : "text-warning"}`}>
                        {t(`student.${m.status}`)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Next lesson */}
          {nextLesson?.allCompleted ? (
            <Link
              to="/certificate"
              className="group glass-strong relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 shadow-glass transition hover:-translate-y-0.5"
            >
              <div aria-hidden className="absolute inset-0 -z-10 bg-[var(--gradient-aurora)] opacity-10" />
              <div>
                <div className="text-xs uppercase tracking-wider text-success">{t("dashboard.courseCompleted")}</div>
                <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
                  <Award className="mr-2 inline h-6 w-6 text-success" />
                  {t("dashboard.courseCompleted")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.courseCompletedDesc")}</p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
                <GraduationCap className="h-5 w-5" /> {t("nav.certificate")}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ) : nextLesson?.lesson ? (
            <Link
              to="/lessons/$slug"
              params={{ slug: nextLesson.lesson.slug }}
              className="group glass-strong relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 shadow-glass transition hover:-translate-y-0.5"
            >
              <div aria-hidden className="absolute inset-0 -z-10 bg-[var(--gradient-aurora)] opacity-10" />
              <div>
                <div className="text-xs uppercase tracking-wider text-primary">{t("dashboard.nextLesson")}</div>
                <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">{nextLesson.lesson.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{t("student.plan.weekShort", { n: nextLesson.lesson.week })} · D{nextLesson.lesson.day}</span>
                  {nextLesson.lesson.topic && <span>· {t(`student.topics.${nextLesson.lesson.topic}`, { defaultValue: nextLesson.lesson.topic })}</span>}
                  <span>· {nextLesson.lesson.est_minutes} min</span>
                </div>
                {nextLesson.lesson.quiz_passed ? (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t("dailyQuiz.passed")} · {t("dailyQuiz.statusBestScore", { n: nextLesson.lesson.quiz_best_score ?? 0 })}
                  </div>
                ) : nextLesson.lesson.quiz_best_score ? (
                  <div className="mt-2 text-xs text-warning">
                    {t("dailyQuiz.statusBestScore", { n: nextLesson.lesson.quiz_best_score })}
                  </div>
                ) : null}
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
                <PlayCircle className="h-5 w-5" /> {t("dashboard.continueLesson")}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ) : (
            <div className="glass-strong rounded-3xl p-6 shadow-glass">
              <div className="text-xs uppercase tracking-wider text-primary">{t("dashboard.nextLesson")}</div>
              <div className="mt-2 text-sm text-muted-foreground">{t("common.loading")}</div>
            </div>
          )}

        </div>

        {/* Action grid */}
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/flashcards"
            className="glass rounded-3xl p-5 transition hover:-translate-y-0.5"
          >
            <Brain className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display text-lg font-semibold">
              {dueCount === null ? t("student.dashboard.flashcards") : dueCount === 0 ? t("student.dashboard.noDueCards") : dueCount === 1 ? t("student.dashboard.dueOne", { n: dueCount }) : t("student.dashboard.dueMany", { n: dueCount })}
            </div>
            <div className="text-sm text-muted-foreground">{t("student.dashboard.sm2")}</div>
          </Link>
          <Link
            to="/simulator"
            className="glass rounded-3xl p-5 transition hover:-translate-y-0.5"
          >
            <Target className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display text-lg font-semibold">{t("student.dashboard.simulatorTitle")}</div>
            <div className="text-sm text-muted-foreground">{t("student.dashboard.simulatorDesc")}</div>
          </Link>
          <Link
            to="/lessons"
            className="glass rounded-3xl p-5 transition hover:-translate-y-0.5"
          >
            <PlayCircle className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display text-lg font-semibold">{t("student.plan.sectionTitle")}</div>
            <div className="text-sm text-muted-foreground">{t("student.plan.continueSubtitle")}</div>
          </Link>
          <Link
            to="/progress"
            className="glass rounded-3xl p-5 transition hover:-translate-y-0.5"
          >
            <TrendingUp className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display text-lg font-semibold">{t("nav.progress")}</div>
            <div className="text-sm text-muted-foreground">{t("student.masteryEmpty", { defaultValue: "Concept mastery & reviews" })}</div>
          </Link>
          <Link
            to="/flycoach"
            className="glass rounded-3xl p-5 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display text-lg font-semibold">{t("student.dashboard.askFlycoach")}</div>
            <div className="text-sm text-muted-foreground">{t("student.dashboard.flycoachDesc")}</div>
          </Link>
        </div>

        {/* Inventory (Sprint I2) */}
        <div className="mt-4">
          <InventoryCard />
        </div>


        {/* Activity */}
        <div className="mt-4 glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">{t("student.dashboard.recentActivity")}</h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {t("student.dashboard.lastDays")}
            </span>
          </div>
          {activity === null ? (
            <div className="mt-4 text-sm text-muted-foreground">{t("student.dashboard.loadingActivity")}</div>
          ) : activity.every((v) => v === 0) ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("student.dashboard.noActivity")}
            </div>
          ) : (
            <div className="mt-4 flex h-24 items-end gap-2" role="img" aria-label={t("student.dashboard.activityAria")}>
              {activity.map((v, i) => {
                const max = Math.max(...activity, 1);
                const pct = (v / max) * 100;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-md bg-[var(--gradient-sky)]"
                      style={{ height: `${Math.max(pct, v > 0 ? 8 : 2)}%`, opacity: v === 0 ? 0.25 : 1 }}
                    />
                    <div className="text-[10px] text-muted-foreground">{DAY_LABELS[i]}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Real recent activity list */}
          <div className="mt-6">
            {recent === null ? (
              <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
            ) : recent.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t("dashboard.activity.none")}
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {recent.map((r, idx) => {
                  const Icon = r.type === "lesson_completed" ? CheckCircle2 : r.type === "quiz_attempt" ? Target : r.type === "exam_simulation" ? Trophy : r.type === "certificate_issued" ? Award : Brain;
                  const inner = (
                    <div className="flex items-center gap-3 py-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-primary"><Icon className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{t(`dashboard.activity.${r.type}`)} · {r.title}</div>
                        {r.subtitle && <div className="truncate text-xs text-muted-foreground">{r.subtitle}</div>}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                  );
                  return (
                    <li key={idx}>
                      {r.href ? <a href={r.href} className="block hover:bg-accent/40 rounded-xl px-2 -mx-2">{inner}</a> : inner}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </StudentAppShell>
  );
}
