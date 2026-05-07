import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getLessons } from "@/server/lessons.functions";

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
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[] | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { if (user) getLessons().then(setLessons); }, [user]);

  if (loading || !user) {
    return <StudentAppShell><div className="mx-auto max-w-5xl px-6 pt-24 text-muted-foreground">{t("common.loading")}</div></StudentAppShell>;
  }

  const weeks = [1, 2, 3, 4];
  const weekTitles: Record<number, string> = {
    1: "Semana 1 · Reglas y Remote PIC",
    2: "Semana 2 · Espacio aéreo y sectional charts",
    3: "Semana 3 · Clima, performance y operaciones",
    4: "Semana 4 · Seguridad, emergencias y simulacros",
  };

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">Ruta de estudio</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-6xl">
          4 semanas. <span className="text-gradient">2 horas al día.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Ruta calibrada al ACS oficial. Cada día combina microlección, fuentes, flashcards y quiz.
        </p>

        <div className="mt-12 space-y-6">
          {weeks.map((wi) => {
            const items = (lessons ?? []).filter((l) => l.week === wi);
            return (
              <div key={wi} className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold">{weekTitles[wi]}</h2>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium">Semana {wi}</span>
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
