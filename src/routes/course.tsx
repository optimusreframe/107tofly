import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/course")({
  head: () => ({
    meta: [
      { title: "Curso 4 semanas — 107toFly" },
      {
        name: "description",
        content:
          "Ruta diaria de 2 h para aprobar el FAA Part 107: regulaciones, espacio aéreo, sectional charts, clima, performance, ADM y simulacros UAG.",
      },
      { property: "og:title", content: "Curso 4 semanas — 107toFly" },
      {
        property: "og:description",
        content: "28 días estructurados con lecciones, flashcards y simulacros UAG.",
      },
    ],
  }),
  component: Course,
});

const weeks = [
  {
    title: "Semana 1 · Reglas y rol del Remote PIC",
    days: [
      "Panorama Part 107",
      "Responsabilidades del Remote PIC",
      "Limitaciones operacionales",
      "Operaciones sobre personas",
      "Remote ID y registro",
      "Waivers y autorizaciones",
      "Repaso + mini examen",
    ],
  },
  {
    title: "Semana 2 · Espacio aéreo y sectional charts",
    days: [
      "National Airspace System",
      "Class B y Class C",
      "Class D y Class E",
      "Class G y zonas especiales",
      "Sectional charts I",
      "Sectional charts II",
      "Repaso + práctica con mapas",
    ],
  },
  {
    title: "Semana 3 · Clima, performance y operaciones",
    days: [
      "Principios de clima",
      "METAR",
      "TAF",
      "Fuentes meteorológicas",
      "Loading & performance",
      "Comunicaciones y aeropuertos",
      "Repaso + mini examen técnico",
    ],
  },
  {
    title: "Semana 4 · Seguridad, emergencias y simulacros",
    days: [
      "ADM y gestión de riesgo",
      "Fisiología",
      "Emergencias",
      "Mantenimiento y preflight",
      "Simulacro completo #1",
      "Repaso dirigido",
      "Simulacro completo #2",
    ],
  },
];

function Course() {
  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">
          Ruta de estudio
        </div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-6xl">
          4 semanas. <span className="text-gradient">2 horas al día.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Una ruta calibrada al ACS oficial. Cada día combina microlección, ejemplos
          guiados, práctica interactiva, flashcards y un quiz medible.
        </p>

        <div className="mt-12 space-y-6">
          {weeks.map((w, wi) => (
            <div key={w.title} className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">{w.title}</h2>
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium">
                  Semana {wi + 1}
                </span>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {w.days.map((d, di) => {
                  const unlocked = wi === 0 && di < 2;
                  const done = wi === 0 && di === 0;
                  return (
                    <div
                      key={d}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs font-mono">
                          D{wi * 7 + di + 1}
                        </span>
                        <span>{d}</span>
                      </div>
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : unlocked ? (
                        <PlayCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
