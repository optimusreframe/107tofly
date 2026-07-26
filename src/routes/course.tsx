import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getLessons } from "@/lib/lessons.functions";

type Lesson = Awaited<ReturnType<typeof getLessons>>[number];

export const Route = createFileRoute("/course")({
  head: () => ({
    meta: [
      { title: "Curso 4 semanas — 107toFly" },
      { name: "description", content: "Ruta diaria de 2h alineada al ACS Part 107: 28 lecciones reales con tracking de progreso." },
      { property: "og:title", content: "Curso 4 semanas — 107toFly" },
      { property: "og:description", content: "28 días con lecciones reales, fuentes oficiales y XP." },
    ],
  }),
  component: Course,
});

function Course() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.startsWith("es") ? "es" : "en") as "en" | "es";
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[] | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { if (user) getLessons({ data: { locale } }).then(setLessons); }, [user, locale]);

  if (loading || !user) {
    return <StudentAppShell><div className="mx-auto max-w-5xl px-6 pt-24 text-muted-foreground">{t("common.loading")}</div></StudentAppShell>;
  }

  const weeks = [1, 2, 3, 4];
  const weekTitles: Record<number, string> = {
    1: t("student.course.week1"),
    2: t("student.course.week2"),
    3: t("student.course.week3"),
    4: t("student.course.week4"),
  };

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">{t("student.course.route")}</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-6xl">
          <span className="text-gradient">{t("student.course.title4w")}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("student.course.desc")}
        </p>

        <div className="mt-12 space-y-6">
          {weeks.map((wi) => {
            const items = (lessons ?? []).filter((l) => l.week === wi);
            return (
              <div key={wi} className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold">{weekTitles[wi]}</h2>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium">{t("student.plan.weekShort", { n: wi })}</span>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {items.length === 0 && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
                  {items.map((l) => {
                    const prevDone = l.order_index === 1 || (lessons ?? []).some((x) => x.order_index === l.order_index - 1 && x.completed);
                    const unlocked = l.completed || prevDone;
                    return (
                      <Link
                        key={l.slug}
                        to="/lessons/$slug"
                        params={{ slug: l.slug }}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm transition hover:bg-accent"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-mono">D{l.order_index}</span>
                          <span className="truncate">{l.title}</span>
                          {l.quiz_passed ? (
                            <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] text-success">{t("dailyQuiz.passed")}</span>
                          ) : l.quiz_attempts > 0 ? (
                            <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning">{l.quiz_best_score}%</span>
                          ) : null}
                        </div>
                        {l.completed ? <CheckCircle2 className="h-4 w-4 text-success" /> : unlocked ? <PlayCircle className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </StudentAppShell>
  );
}
