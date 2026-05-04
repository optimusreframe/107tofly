import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { QuizDemo } from "@/components/QuizDemo";
import { Clock, Target, ListChecks } from "lucide-react";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Simulador UAG — 107toFly" },
      {
        name: "description",
        content:
          "Simulacro completo del examen FAA UAG: 60 preguntas, 2 horas, ponderación por dominios ACS y reporte de debilidades.",
      },
      { property: "og:title", content: "Simulador UAG — 107toFly" },
      {
        property: "og:description",
        content: "60 preguntas. 2 horas. Pasa con 70% interno; recomendado 85%+.",
      },
    ],
  }),
  component: Simulator,
});

function Simulator() {
  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">
          Exam Simulator
        </div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-6xl">
          Simula el <span className="text-gradient">UAG</span> real.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Estructura idéntica al examen oficial: 60 preguntas en 2 horas, ponderadas
          por dominios ACS, con figuras del Testing Supplement.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: Clock, t: "2 horas", d: "Mismo timing del examen oficial." },
            { icon: ListChecks, t: "60 preguntas", d: "Distribuidas por dominios ACS." },
            { icon: Target, t: "70% mínimo", d: "Recomendamos 85%+ consistente." },
          ].map((s) => (
            <div key={s.t} className="glass rounded-3xl p-5">
              <s.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-display text-xl font-semibold">{s.t}</div>
              <div className="text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Preview de pregunta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Así se siente cada pregunta del simulacro.
          </p>
          <div className="mt-5">
            <QuizDemo />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
