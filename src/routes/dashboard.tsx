import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — 107toFly" },
      { name: "description", content: "Tu progreso, readiness score y próxima lección recomendada." },
    ],
  }),
  component: Dashboard,
});

const rings = [
  { label: "Estudio", value: 78, color: "oklch(0.62 0.2 255)" },
  { label: "Práctica", value: 64, color: "oklch(0.7 0.16 235)" },
  { label: "Repaso", value: 92, color: "oklch(0.68 0.16 155)" },
];

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
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState<ProgressRow | null>(null);
  const [name, setName] = useState<string>("Pilot");

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
  }, [user]);

  const readiness = progress?.readiness ?? 0;
  const ringValues = [
    { label: "Estudio", value: progress?.study_pct ?? 0, color: "oklch(0.62 0.2 255)" },
    { label: "Práctica", value: progress?.practice_pct ?? 0, color: "oklch(0.7 0.16 235)" },
    { label: "Repaso", value: progress?.review_pct ?? 0, color: "oklch(0.68 0.16 155)" },
  ];

  if (loading || !user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-6xl px-6 pt-24 text-muted-foreground">Cargando…</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-6 pt-12 md:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Hola, {name}</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">
              Tu progreso · <span className="text-gradient">sigue volando</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1.5 text-sm font-medium text-warning-foreground">
              <Flame className="h-4 w-4 text-warning" /> {progress?.streak ?? 0} días streak
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
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Readiness Score</div>
                <div className="mt-1 font-display text-5xl font-semibold">
                  {readiness}<span className="text-xl text-muted-foreground">/100</span>
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-success">
                  <TrendingUp className="h-4 w-4" /> Almost ready · sigue así
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
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: "Mapas", v: 92 },
                { l: "Clima", v: 71 },
                { l: "Reglas", v: 85 },
                { l: "ADM", v: 64 },
              ].map((d) => (
                <div key={d.l} className="rounded-2xl border border-border bg-card/60 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.l}</div>
                  <div className="font-display text-lg font-semibold">{d.v}%</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-[var(--gradient-sky)]" style={{ width: `${d.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next lesson */}
          <Link
            to="/lesson"
            className="group glass-strong relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 shadow-glass transition hover:-translate-y-0.5"
          >
            <div aria-hidden className="absolute inset-0 -z-10 bg-[var(--gradient-aurora)] opacity-10" />
            <div>
              <div className="text-xs uppercase tracking-wider text-primary">Siguiente lección</div>
              <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
                Class B y autorizaciones LAANC
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                25 min · 14 CFR 107.41 · ACS UA.I.B.K1
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
              <PlayCircle className="h-5 w-5" /> Continuar
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
            <div className="mt-3 font-display text-lg font-semibold">8 flashcards vencen hoy</div>
            <div className="text-sm text-muted-foreground">Spaced repetition · 4 min</div>
          </Link>
          <Link
            to="/simulator"
            className="glass rounded-3xl p-5 transition hover:-translate-y-0.5"
          >
            <Target className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display text-lg font-semibold">Simulacro UAG</div>
            <div className="text-sm text-muted-foreground">60 preguntas · 2 horas</div>
          </Link>
          <Link
            to="/flycoach"
            className="glass rounded-3xl p-5 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display text-lg font-semibold">Pregunta a FlyCoach</div>
            <div className="text-sm text-muted-foreground">Tutor IA · respuestas con fuente</div>
          </Link>
        </div>

        {/* Activity */}
        <div className="mt-4 glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Actividad reciente</h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Últimos 7 días
            </span>
          </div>
          <div className="mt-4 flex h-24 items-end gap-2">
            {[40, 65, 30, 80, 55, 90, 70].map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-md bg-[var(--gradient-sky)]"
                  style={{ height: `${v}%` }}
                />
                <div className="text-[10px] text-muted-foreground">{["L","M","X","J","V","S","D"][i]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
