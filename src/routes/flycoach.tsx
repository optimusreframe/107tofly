import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Sparkles, MessageCircle, Map, CloudSun, Target, BookOpen } from "lucide-react";

export const Route = createFileRoute("/flycoach")({
  head: () => ({
    meta: [
      { title: "FlyCoach AI — Tutor Part 107 | 107toFly" },
      {
        name: "description",
        content:
          "FlyCoach AI explica conceptos, repregunta, hace roleplay y te corrige usando solo fuentes oficiales FAA.",
      },
      { property: "og:title", content: "FlyCoach AI — Tutor Part 107" },
      {
        property: "og:description",
        content: "Tu tutor 24/7 basado en el ACS y la Remote Pilot Study Guide.",
      },
    ],
  }),
  component: FlyCoach,
});

const modes = [
  { icon: BookOpen, t: "Explain like I'm new", d: "Analogías simples para conceptos densos." },
  { icon: MessageCircle, t: "Quiz me", d: "Mini quizzes infinitos sobre cualquier tema." },
  { icon: Map, t: "Map coach", d: "Te guía por sectional charts paso a paso." },
  { icon: CloudSun, t: "Weather decoder", d: "METAR/TAF descifrados visualmente." },
  { icon: Target, t: "Mistake coach", d: "Detecta tus patrones de error y los rompe." },
  { icon: Sparkles, t: "Exam readiness", d: "Te dice cuándo estás listo de verdad." },
];

function FlyCoach() {
  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">
          Tutor IA
        </div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-6xl">
          Conoce a <span className="text-gradient">FlyCoach</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Un tutor que solo cita fuentes oficiales FAA. Si no sabe algo, lo dice.
          Si te equivocas, te enseña. Si dudas, te repregunta.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modes.map((m) => (
            <div key={m.t} className="glass rounded-3xl p-5 transition hover:-translate-y-0.5">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--gradient-sky)] text-primary-foreground">
                <m.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-display text-lg font-semibold">{m.t}</div>
              <div className="text-sm text-muted-foreground">{m.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 glass-strong rounded-3xl p-6 shadow-elevated">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Sparkles className="h-4 w-4" /> Conversación de ejemplo
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-accent/60 p-3">
              <span className="font-medium">Tú:</span> ¿Por qué necesito autorización para
              volar cerca de un Class D si está apagada la torre?
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-3">
              <span className="font-medium text-primary">FlyCoach:</span> Cuando la torre
              está cerrada, el espacio aéreo Class D usualmente revierte a Class E o G,
              dependiendo de la carta. Revisa el segmento de la sectional con el
              asterisco (*) junto a la frecuencia. Bajo 14 CFR 107.41, autorización ATC
              solo aplica cuando el espacio sigue siendo controlado.
              <div className="mt-2 text-xs text-muted-foreground">
                Fuente: 14 CFR 107.41 · Remote Pilot Study Guide cap. 3
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
