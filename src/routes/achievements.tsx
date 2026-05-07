import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { Award, Plane, Map, CloudSun, Shield, Trophy, Sparkles, Target, Zap, BookMarked } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAchievements } from "@/server/lessons.functions";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  first_takeoff: Plane,
  chart_navigator: Map,
  weather_decoder: CloudSun,
  safety_first: Shield,
  exam_ready: Trophy,
  perfect_flight: Sparkles,
  half_course: BookMarked,
  streak_30: Zap,
};

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Logros — 107toFly" },
      { name: "description", content: "XP, badges y niveles que ganas mientras dominas Part 107." },
    ],
  }),
  component: Achievements,
});

function Achievements() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Awaited<ReturnType<typeof getAchievements>> | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { if (user) getAchievements().then(setData); }, [user]);

  if (loading || !user || !data) {
    return <StudentAppShell><div className="mx-auto max-w-6xl px-6 pt-24 text-muted-foreground">Cargando…</div></StudentAppShell>;
  }

  const pct = Math.min(100, Math.round((data.xp / Math.max(1, data.nextXp)) * 100));

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-6xl px-6 pt-12 md:pt-16">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">Logros</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Cada vuelo te hace <span className="text-gradient">mejor piloto</span>.
        </h1>

        <div className="mt-10 glass-strong rounded-3xl p-6 shadow-glass">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Nivel actual</div>
              <div className="font-display text-2xl font-semibold">
                Lv {data.currentLevel + 1} · {data.levels[data.currentLevel]}
              </div>
            </div>
            <div className="rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
              {data.xp} / {data.nextXp} XP
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-[var(--gradient-aurora)]" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            {data.levels.map((l, i) => (
              <span
                key={l}
                className={`rounded-full border px-3 py-1 ${i <= data.currentLevel ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              >
                {i + 1}. {l}
              </span>
            ))}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Lecciones completadas: <span className="font-medium text-foreground">{data.lessonsDone}/{data.lessonsTotal}</span> · Streak: <span className="font-medium text-foreground">{data.streak} días</span>
          </div>
        </div>

        <h2 className="mt-12 font-display text-2xl font-semibold">Badges</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.badges.map((b) => {
            const Icon = ICONS[b.id] ?? Award;
            return (
              <div key={b.id} className={`glass rounded-3xl p-5 transition ${b.got ? "" : "opacity-50"}`}>
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${b.got ? "bg-[var(--gradient-aurora)] text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 font-display text-base font-semibold">{b.name}</div>
                <div className="text-sm text-muted-foreground">{b.desc}</div>
                {b.got && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                    <Award className="h-3 w-3" /> Obtenido
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10">
          <Link to="/lessons" className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90">
            Ir al plan de 28 días
          </Link>
        </div>
      </section>
    </StudentAppShell>
  );
}
