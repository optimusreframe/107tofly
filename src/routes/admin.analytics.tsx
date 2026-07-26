import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Shield, BarChart3, TrendingUp, Users, Award, Target, BookOpen } from "lucide-react";
import { AdminAppShell } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { Badge } from "@/components/ui/badge";
import {
  getAdminAnalytics,
  getAdminTopicAnalytics,
  getAdminQuestionAnalytics,
  getAdminStudentFunnel,
} from "@/lib/admin.functions";
import { getEngineMetrics, type EngineMetrics } from "@/lib/admin-engine.functions";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Admin · 107toFly" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAnalyticsPage,
});

type Overview = Awaited<ReturnType<typeof getAdminAnalytics>>;
type Topics = Awaited<ReturnType<typeof getAdminTopicAnalytics>>;
type Questions = Awaited<ReturnType<typeof getAdminQuestionAnalytics>>;
type Funnel = Awaited<ReturnType<typeof getAdminStudentFunnel>>;

function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const fOverview = useServerFn(getAdminAnalytics);
  const fTopics = useServerFn(getAdminTopicAnalytics);
  const fQuestions = useServerFn(getAdminQuestionAnalytics);
  const fFunnel = useServerFn(getAdminStudentFunnel);
  const fEngine = useServerFn(getEngineMetrics);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [topics, setTopics] = useState<Topics | null>(null);
  const [questions, setQuestions] = useState<Questions | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [engine, setEngine] = useState<EngineMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([fOverview(), fTopics(), fQuestions(), fFunnel(), fEngine()])
      .then(([o, t, q, f, e]) => { setOverview(o); setTopics(t); setQuestions(q); setFunnel(f); setEngine(e); })
      .catch((e) => setError(e?.message ?? "Error"));
  }, [isAdmin, fOverview, fTopics, fQuestions, fFunnel, fEngine]);

  if (authLoading || rolesLoading) {
    return <AdminAppShell><div className="p-8 text-sm text-muted-foreground">{t("common.loading")}</div></AdminAppShell>;
  }

  if (!isAdmin) {
    return (
      <AdminAppShell>
        <div className="mx-auto max-w-md p-8 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-semibold">Access denied</h1>
          <Link to="/dashboard" className="mt-6 inline-flex rounded-full bg-foreground px-4 py-2 text-sm text-background">Dashboard</Link>
        </div>
      </AdminAppShell>
    );
  }

  const cards: Array<{ label: string; value: number | string; icon: typeof Users }> = overview ? [
    { label: t("admin.analytics.users"), value: overview.totalUsers, icon: Users },
    { label: t("admin.analytics.active7d"), value: overview.activeStudents7d, icon: TrendingUp },
    { label: t("admin.analytics.active30d"), value: overview.activeStudents30d, icon: TrendingUp },
    { label: t("admin.analytics.lessonsCompleted"), value: overview.totalLessonsCompleted, icon: BookOpen },
    { label: t("admin.analytics.quizAttempts"), value: overview.totalQuizAttempts, icon: Target },
    { label: t("admin.analytics.examSimulations"), value: overview.totalExamSimulations, icon: Target },
    { label: t("admin.analytics.certificates"), value: overview.totalCertificates, icon: Award },
    { label: t("admin.analytics.avgQuizScore"), value: overview.averageQuizScore + "%", icon: BarChart3 },
    { label: t("admin.analytics.avgExamScore"), value: overview.averageExamScore + "%", icon: BarChart3 },
    { label: t("admin.analytics.examReady"), value: overview.examReadyCount, icon: Award },
  ] : [];

  const funnelSteps: Array<{ label: string; value: number }> = funnel ? [
    { label: t("admin.analytics.funnelSteps.signedUp"), value: funnel.signedUp },
    { label: t("admin.analytics.funnelSteps.onboarded"), value: funnel.onboarded },
    { label: t("admin.analytics.funnelSteps.startedCourse"), value: funnel.startedCourse },
    { label: t("admin.analytics.funnelSteps.completedFirstLesson"), value: funnel.completedFirstLesson },
    { label: t("admin.analytics.funnelSteps.completedWeek1"), value: funnel.completedWeek1 },
    { label: t("admin.analytics.funnelSteps.completedCourse"), value: funnel.completedCourse },
    { label: t("admin.analytics.funnelSteps.tookPractice"), value: funnel.tookPractice },
    { label: t("admin.analytics.funnelSteps.tookSimulator"), value: funnel.tookSimulator },
    { label: t("admin.analytics.funnelSteps.examReady"), value: funnel.examReady },
    { label: t("admin.analytics.funnelSteps.certificateIssued"), value: funnel.certificateIssued },
  ] : [];
  const funnelMax = Math.max(...funnelSteps.map((s) => s.value), 1);

  return (
    <AdminAppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6 flex items-center gap-3">
          <BarChart3 className="h-6 w-6" />
          <div>
            <h1 className="font-display text-2xl font-semibold">{t("admin.analytics.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.analytics.subtitle")}</p>
          </div>
        </header>

        {error && <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {/* Overview cards */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("admin.analytics.overview")}</h2>
          {!overview ? (
            <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {cards.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="rounded-2xl border border-border bg-card/60 p-4">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="mt-2 font-display text-2xl font-semibold">{c.value}</div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Funnel */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("admin.analytics.funnel")}</h2>
          <div className="rounded-2xl border border-border bg-card/40 p-4">
            {!funnel ? (
              <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
            ) : funnelSteps.every((s) => s.value === 0) ? (
              <div className="text-sm text-muted-foreground">{t("admin.analytics.noData")}</div>
            ) : (
              <div className="space-y-2">
                {funnelSteps.map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="w-48 text-xs text-muted-foreground">{s.label}</div>
                    <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted">
                      <div
                        className="h-full bg-[var(--gradient-sky,linear-gradient(90deg,var(--primary),var(--primary)))]"
                        style={{ width: `${(s.value / funnelMax) * 100}%`, background: "var(--gradient-sky)" }}
                      />
                    </div>
                    <div className="w-12 text-right text-sm font-medium tabular-nums">{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Topic Performance */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("admin.analytics.topicPerformance")}</h2>
          {!topics ? (
            <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("admin.common.topic")}</th>
                    <th className="px-3 py-2 text-right">{t("admin.analytics.attempts")}</th>
                    <th className="px-3 py-2 text-right">{t("admin.analytics.avgScore")}</th>
                    <th className="px-3 py-2 text-right">{t("admin.analytics.weakRate")}</th>
                    <th className="px-3 py-2 text-right">{t("admin.analytics.questions")}</th>
                    <th className="px-3 py-2 text-right">{t("admin.common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((row) => {
                    const status = row.averageScore >= 80 ? "strong" : row.averageScore >= 60 ? "average" : "weak";
                    const variant = status === "strong" ? "default" : status === "average" ? "secondary" : "destructive";
                    return (
                      <tr key={row.topic} className="border-t border-border">
                        <td className="px-3 py-2 capitalize">{row.topic}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.quizAttempts}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.averageScore}%</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.weakRate}%</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.questionCount}</td>
                        <td className="px-3 py-2 text-right">
                          <Badge variant={variant as "default" | "secondary" | "destructive"}>
                            {t(`admin.analytics.statusLabels.${status}`)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Most Missed Questions */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("admin.analytics.mostMissed")}</h2>
          {!questions ? (
            <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : questions.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("admin.analytics.noData")}</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("admin.questions.question")}</th>
                    <th className="px-3 py-2 text-left">{t("admin.common.topic")}</th>
                    <th className="px-3 py-2 text-left">{t("admin.common.difficulty")}</th>
                    <th className="px-3 py-2 text-right">{t("admin.analytics.correctRate")}</th>
                    <th className="px-3 py-2 text-right">{t("admin.analytics.answers")}</th>
                    <th className="px-3 py-2 text-left">{t("admin.common.source")}</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.questionId} className="border-t border-border">
                      <td className="max-w-xs truncate px-3 py-2">{q.question}</td>
                      <td className="px-3 py-2 capitalize">{q.topic}</td>
                      <td className="px-3 py-2 capitalize">{q.difficulty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{q.correctRate}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{q.totalAnswers}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{q.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminAppShell>
  );
}
