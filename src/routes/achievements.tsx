import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Award, Plane, Map, CloudSun, Shield, Trophy, Sparkles, Target, Zap } from "lucide-react";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Logros — 107toFly" },
      { name: "description", content: "XP, badges y niveles que ganas mientras dominas Part 107." },
    ],
  }),
  component: Achievements,
});

const badges = [
  { icon: Plane, name: "First Takeoff", desc: "Primera lección completada", got: true },
  { icon: Map, name: "Chart Navigator", desc: "80%+ en sectional charts", got: true },
  { icon: CloudSun, name: "Weather Decoder", desc: "80%+ en METAR/TAF", got: false },
  { icon: Shield, name: "Safety First", desc: "Emergencias y ADM completados", got: true },
  { icon: Trophy, name: "Exam Ready", desc: "Dos simulacros sobre 85%", got: false },
  { icon: Sparkles, name: "Perfect Flight", desc: "Quiz al 100%", got: true },
  { icon: Target, name: "Comeback Pilot", desc: "Repite y mejora un quiz fallado", got: true },
  { icon: Zap, name: "30-Day Streak", desc: "Estudio 30 días consecutivos", got: false },
];

const levels = [
  "Ground School Starter",
  "Drone Cadet",
  "Airspace Explorer",
  "Weather Reader",
  "Mission Planner",
  "Remote PIC Ready",
  "Exam Ready Pilot",
];

function Achievements() {
  const currentLevel = 3;
  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-6 pt-12 md:pt-16">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">Logros</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Cada vuelo te hace <span className="text-gradient">mejor piloto</span>.
        </h1>

        {/* Level track */}
        <div className="mt-10 glass-strong rounded-3xl p-6 shadow-glass">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Nivel actual</div>
              <div className="font-display text-2xl font-semibold">
                Lv {currentLevel + 1} · {levels[currentLevel]}
              </div>
            </div>
            <div className="rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
              1,840 / 2,400 XP
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-[var(--gradient-aurora)]" style={{ width: "76%" }} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            {levels.map((l, i) => (
              <span
                key={l}
                className={`rounded-full border px-3 py-1 ${i <= currentLevel ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              >
                {i + 1}. {l}
              </span>
            ))}
          </div>
        </div>

        {/* Badges */}
        <h2 className="mt-12 font-display text-2xl font-semibold">Badges</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {badges.map((b) => (
            <div
              key={b.name}
              className={`glass rounded-3xl p-5 transition ${b.got ? "" : "opacity-50"}`}
            >
              <div
                className={`grid h-12 w-12 place-items-center rounded-2xl ${b.got ? "bg-[var(--gradient-aurora)] text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                <b.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-display text-base font-semibold">{b.name}</div>
              <div className="text-sm text-muted-foreground">{b.desc}</div>
              {b.got && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                  <Award className="h-3 w-3" /> Obtenido
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
