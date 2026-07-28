import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { getMasteryOverview, type UnitMastery } from "@/lib/mastery-overview.functions";
import { Plane, Lock, Check, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/flight-path")({
  head: () => ({
    meta: [
      { title: "Flight Path · Tu ruta de vuelo — 107toFly" },
      { name: "description", content: "Visualiza tu progreso como una ruta de vuelo: cada unidad es un waypoint, cada dominio es un checkpoint hacia el Part 107." },
      { property: "og:title", content: "Flight Path — 107toFly" },
      { property: "og:description", content: "Tu ruta visual hacia el certificado Part 107." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlightPathPage,
});

function nodeState(u: UnitMastery, prev: UnitMastery | undefined): "locked" | "active" | "in_progress" | "done" {
  if (u.avgMasteryPct >= 80) return "done";
  if (u.seenCount > 0) return "in_progress";
  if (!prev || prev.avgMasteryPct >= 60) return "active";
  return "locked";
}

function FlightPathPage() {
  const fetchOverview = useServerFn(getMasteryOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["mastery-overview-flightpath"],
    queryFn: () => fetchOverview(),
  });

  const units = data?.units ?? [];
  const totalAvg = units.length
    ? Math.round(units.reduce((s, u) => s + u.avgMasteryPct, 0) / units.length)
    : 0;
  const nextUnit = units.find((u, i) => nodeState(u, units[i - 1]) === "active" || nodeState(u, units[i - 1]) === "in_progress");

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-5xl px-6 pt-12 md:pt-16">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">Flight Path</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Tu ruta hacia el <span className="text-gradient">Part 107.</span>
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Cada unidad es un waypoint. Domínalo para desbloquear el siguiente y avanzar hacia el certificado.
        </p>

        {/* Progress header */}
        <div className="glass-strong mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 shadow-glass">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Progreso total</div>
            <div className="mt-1 font-display text-3xl font-semibold">{totalAvg}%</div>
            <div className="text-xs text-muted-foreground">
              {units.filter((u) => u.avgMasteryPct >= 80).length} de {units.length} unidades dominadas
            </div>
          </div>
          {nextUnit && (
            <Link
              to="/learn/$unitSlug"
              params={{ unitSlug: nextUnit.slug }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
            >
              Continuar en {nextUnit.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Path */}
        <div className="relative mt-10">
          {isLoading && (
            <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
              Cargando tu ruta…
            </div>
          )}

          {!isLoading && units.length === 0 && (
            <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
              Aún no hay unidades publicadas. Vuelve pronto.
            </div>
          )}

          <ol className="relative space-y-6">
            {units.map((u, i) => {
              const state = nodeState(u, units[i - 1]);
              const isLast = i === units.length - 1;
              const side = i % 2 === 0 ? "left" : "right";
              return (
                <li key={u.id} className="relative">
                  {/* Connector */}
                  {!isLast && (
                    <div
                      aria-hidden
                      className="absolute left-1/2 top-16 h-[calc(100%+1.5rem)] w-0.5 -translate-x-1/2 bg-gradient-to-b from-primary/40 to-primary/10"
                    />
                  )}

                  <div className={`grid gap-4 md:grid-cols-2 md:items-center ${side === "right" ? "md:[direction:rtl]" : ""}`}>
                    {/* Node */}
                    <div className="flex items-center justify-center [direction:ltr]">
                      <NodeIcon state={state} label={`${i + 1}`} />
                    </div>

                    {/* Card */}
                    <div className={`glass-strong rounded-3xl p-5 shadow-glass [direction:ltr] ${state === "locked" ? "opacity-60" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Waypoint {i + 1}
                          </div>
                          <h3 className="mt-1 font-display text-xl font-semibold">{u.title}</h3>
                          {u.summary && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{u.summary}</p>
                          )}
                        </div>
                        <StateBadge state={state} />
                      </div>

                      {/* Mastery bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Dominio</span>
                          <span className="font-mono">{u.avgMasteryPct}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                            style={{ width: `${u.avgMasteryPct}%` }}
                          />
                        </div>
                        <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                          <span>{u.masteredCount}/{u.conceptCount} conceptos</span>
                          {u.dueCount > 0 && <span className="text-primary">{u.dueCount} due</span>}
                        </div>
                      </div>

                      {state !== "locked" && (
                        <Link
                          to="/learn/$unitSlug"
                          params={{ unitSlug: u.slug }}
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          {state === "done" ? "Repasar" : state === "in_progress" ? "Continuar" : "Empezar"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Destination */}
          {units.length > 0 && !isLoading && (
            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="font-display text-lg font-semibold">Certificado Part 107</div>
              <p className="max-w-xs text-xs text-muted-foreground">
                Al dominar todas las unidades desbloqueas la simulación de examen y tu certificado.
              </p>
              <Link to="/simulator" className="mt-1 text-xs font-medium text-primary hover:underline">
                Ir al simulador →
              </Link>
            </div>
          )}
        </div>
      </section>
    </StudentAppShell>
  );
}

function NodeIcon({ state, label }: { state: "locked" | "active" | "in_progress" | "done"; label: string }) {
  const base = "grid h-14 w-14 place-items-center rounded-full text-sm font-bold shadow-lg ring-4";
  if (state === "done") {
    return (
      <div className={`${base} bg-success text-success-foreground ring-success/20`}>
        <Check className="h-6 w-6" />
      </div>
    );
  }
  if (state === "locked") {
    return (
      <div className={`${base} bg-muted text-muted-foreground ring-muted/30`}>
        <Lock className="h-5 w-5" />
      </div>
    );
  }
  if (state === "in_progress") {
    return (
      <div className={`${base} bg-primary text-primary-foreground ring-primary/20 animate-pulse`}>
        <Plane className="h-5 w-5" />
      </div>
    );
  }
  return (
    <div className={`${base} bg-primary/90 text-primary-foreground ring-primary/30`}>{label}</div>
  );
}

function StateBadge({ state }: { state: "locked" | "active" | "in_progress" | "done" }) {
  const map = {
    done: { label: "Dominado", cls: "bg-success/10 text-success" },
    in_progress: { label: "En curso", cls: "bg-primary/10 text-primary" },
    active: { label: "Disponible", cls: "bg-accent text-accent-foreground" },
    locked: { label: "Bloqueado", cls: "bg-muted text-muted-foreground" },
  } as const;
  const m = map[state];
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}
