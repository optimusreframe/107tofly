import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { CheckCircle2, Lock, PlayCircle, Clock } from "lucide-react";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useAuth } from "@/hooks/use-auth";
import { getLessons } from "@/server/lessons.functions";

type Lesson = Awaited<ReturnType<typeof getLessons>>[number];

export const Route = createFileRoute("/lessons/")({
  head: () => ({
    meta: [
      { title: "Lecciones · Plan 28 días — 107toFly" },
      { name: "description", content: "Plan diario de 4 semanas alineado al ACS Part 107 con lecciones, fuentes y completion tracking." },
      { property: "og:title", content: "Lecciones · Plan 28 días — 107toFly" },
      { property: "og:description", content: "Plan diario de 4 semanas para aprobar el FAA Part 107." },
    ],
  }),
  component: LessonsPage,
});

function LessonsPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    getLessons().then(setLessons).catch((e) => console.error(e));
  }, [user]);

  if (loading || !user) {
    return <StudentAppShell><div className="mx-auto max-w-6xl px-6 pt-24 text-muted-foreground">{t("common.loading")}</div></StudentAppShell>;
  }

  const weeks = [1, 2, 3, 4];
  const completedCount = lessons?.filter((l) => l.completed).length ?? 0;
  const total = lessons?.length ?? 28;

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-5xl px-6 pt-12 md:pt-16">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">{t("student.plan.title")}</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-6xl">
          {t("student.plan.heroDays")} <span className="text-gradient">{t("student.plan.heroLessons")}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("student.plan.heroDescription")}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm">
          {t("student.plan.progressOf", { c: completedCount, n: total })}
        </div>

        <div className="mt-10 space-y-6">
          {weeks.map((w) => {
            const items = (lessons ?? []).filter((l) => l.week === w);
            return (
              <div key={w} className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold">{t("student.plan.weekShort", { n: w })}</h2>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium">{t("student.plan.lessonsCount", { n: items.length })}</span>
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
                        className={`flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm transition hover:bg-accent ${unlocked ? "" : "opacity-60"}`}
                        aria-disabled={!unlocked}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-mono">D{l.order_index}</span>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{l.title}</div>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" /> {l.est_minutes} min
                            </div>
                          </div>
                        </div>
                        {l.completed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : unlocked ? <PlayCircle className="h-4 w-4 shrink-0 text-primary" /> : <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />}
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
