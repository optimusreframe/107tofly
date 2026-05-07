import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fetchDueFlashcards, getStudentReadiness, getStudentTopicMastery } from "@/server/study.functions";
import { getNextLesson, getStudentRecentActivity, type ActivityItem } from "@/server/student-settings.functions";
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

type Mastery = Awaited<ReturnType<typeof getStudentTopicMastery>>;
type Readiness = Awaited<ReturnType<typeof getStudentReadiness>>;
type NextLesson = Awaited<ReturnType<typeof getNextLesson>>;

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
  const fetchDue = useServerFn(fetchDueFlashcards);
  const fetchReadiness = useServerFn(getStudentReadiness);
  const fetchMastery = useServerFn(getStudentTopicMastery);
  const fetchNext = useServerFn(getNextLesson);
  const fetchActivity = useServerFn(getStudentRecentActivity);
  const [progress, setProgress] = useState<ProgressRow | null>(null);
  const [name, setName] = useState<string>("Pilot");
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [activity, setActivity] = useState<number[] | null>(null);
  const [readinessData, setReadinessData] = useState<Readiness | null>(null);
  const [mastery, setMastery] = useState<Mastery | null>(null);
  const [nextLesson, setNextLesson] = useState<NextLesson | null>(null);
  const [recent, setRecent] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("progress")
      .select("study_pct,practice_pct,review_pct,readiness,xp,streak")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => data && setProgress(data as ProgressRow));
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setName(data.display_name);
      });
    fetchDue().then((d) => setDueCount(Array.isArray(d) ? d.length : 0)).catch(() => setDueCount(0));
    fetchReadiness().then(setReadinessData).catch(() => setReadinessData(null));
    fetchMastery()
      .then((d) => {
        const arr = Array.isArray(d)
          ? d
          : Array.isArray((d as { topics?: unknown })?.topics)
            ? ((d as { topics: Mastery }).topics)
            : Array.isArray((d as { mastery?: unknown })?.mastery)
              ? ((d as { mastery: Mastery }).mastery)
              : ([] as unknown as Mastery);
        setMastery(arr);
      })
      .catch(() => setMastery([] as unknown as Mastery));

    // Build last-7-days activity from real signals (lessons + quizzes + sims)
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const sinceIso = since.toISOString();
    Promise.all([
      supabase.from("lesson_completions").select("completed_at").eq("user_id", user.id).gte("completed_at", sinceIso),
      supabase.from("quiz_attempts").select("started_at").eq("user_id", user.id).gte("started_at", sinceIso),
      supabase.from("exam_simulations").select("started_at").eq("user_id", user.id).gte("started_at", sinceIso),
    ]).then(([lc, qa, es]) => {
      const counts = new Array(7).fill(0) as number[];
      const bucket = (iso?: string | null) => {
        if (!iso) return;
        const d = new Date(iso);
        d.setHours(0, 0, 0, 0);
        const idx = Math.round((d.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
        if (idx >= 0 && idx < 7) counts[idx] += 1;
      };
      (lc.data ?? []).forEach((r: { completed_at: string }) => bucket(r.completed_at));
      (qa.data ?? []).forEach((r: { started_at: string }) => bucket(r.started_at));
      (es.data ?? []).forEach((r: { started_at: string }) => bucket(r.started_at));
      setActivity(counts);
    }).catch(() => setActivity([]));

    fetchNext().then(setNextLesson).catch(() => setNextLesson(null));
    fetchActivity().then(setRecent).catch(() => setRecent([]));
  }, [user, fetchDue, fetchReadiness, fetchMastery, fetchNext, fetchActivity]);


  const readiness = readinessData?.score ?? progress?.readiness ?? 0;
  const readinessStatusKey = readinessData?.status ?? (readiness >= 85 ? "ready" : readiness >= 70 ? "almost" : readiness >= 50 ? "building" : "foundation");
  const ringValues = [
    { label: t("student.dashboard.study"), value: progress?.study_pct ?? 0, color: "oklch(0.62 0.2 255)" },
    { label: t("student.dashboard.practice"), value: progress?.practice_pct ?? 0, color: "oklch(0.7 0.16 235)" },
    { label: t("student.dashboard.review"), value: progress?.review_pct ?? 0, color: "oklch(0.68 0.16 155)" },
  ];

  if (loading || !user) {
    return (
      <StudentAppShell>
        <div className="mx-auto max-w-6xl px-6 pt-24 text-muted-foreground">{t("common.loading")}</div>
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
          <Link
            to="/lessons"
            className="group glass-strong relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 shadow-glass transition hover:-translate-y-0.5"
          >
            <div aria-hidden className="absolute inset-0 -z-10 bg-[var(--gradient-aurora)] opacity-10" />
            <div>
              <div className="text-xs uppercase tracking-wider text-primary">{t("student.plan.title")}</div>
              <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
                {t("student.dashboard.continueTitle" as never, { defaultValue: t("student.plan.continueTitle") })}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("student.plan.continueSubtitle")}
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
              <PlayCircle className="h-5 w-5" /> {t("student.plan.seeLessons")}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
          </Link>

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
            to="/flycoach"
            className="glass rounded-3xl p-5 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display text-lg font-semibold">{t("student.dashboard.askFlycoach")}</div>
            <div className="text-sm text-muted-foreground">{t("student.dashboard.flycoachDesc")}</div>
          </Link>
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
        </div>
      </section>
    </StudentAppShell>
  );
}
