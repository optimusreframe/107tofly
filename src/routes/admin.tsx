import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Users, BookOpen, ListChecks, Award, FileCheck, Brain, LifeBuoy } from "lucide-react";
import { AdminAppShell, ADMIN_NAV } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { getAdminMetrics } from "@/server/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — 107toFly" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Metrics = Awaited<ReturnType<typeof getAdminMetrics>>;

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const fetchMetrics = useServerFn(getAdminMetrics);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchMetrics()
      .then(setMetrics)
      .catch((e) => setError(e?.message ?? "Error"));
  }, [isAdmin, fetchMetrics]);

  if (authLoading || rolesLoading) {
    return (
      <AdminAppShell>
        <div className="p-8 text-sm text-muted-foreground">Cargando…</div>
      </AdminAppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AdminAppShell>
        <div className="mx-auto max-w-md p-8 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No tienes permisos para acceder al panel de administración.
          </p>
          <Link to="/dashboard" className="mt-6 inline-flex rounded-full bg-foreground px-4 py-2 text-sm text-background">
            Volver al dashboard
          </Link>
        </div>
      </AdminAppShell>
    );
  }

  const stats = [
    { label: "Usuarios", value: metrics?.users, icon: Users },
    { label: "Lecciones", value: metrics?.lessons, icon: BookOpen },
    { label: "Preguntas", value: metrics?.questions, icon: ListChecks },
    { label: "Quiz attempts", value: metrics?.quizAttempts, icon: Brain },
    { label: "Simulaciones", value: metrics?.examSimulations, icon: FileCheck },
    { label: "Certificados", value: metrics?.certificates, icon: Award },
    { label: "Estudiantes activos", value: undefined, icon: Users, soon: true },
    { label: "Tickets soporte", value: undefined, icon: LifeBuoy, soon: true },
  ];

  return (
    <AdminAppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Métricas globales de la plataforma.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <section aria-label="Stats" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-3 font-display text-3xl font-semibold tabular-nums">
                  {s.soon ? <span className="text-base text-muted-foreground">Coming soon</span> : (s.value ?? "—")}
                </div>
              </div>
            );
          })}
        </section>

        <section aria-label="Sections" className="mt-10">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">Secciones</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ADMIN_NAV.filter((n) => n.to !== "/admin").map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.to}
                  className={`rounded-2xl border border-border/60 bg-card/40 p-5 ${n.ready ? "" : "opacity-70"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{n.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {n.ready ? "Disponible" : "Próximamente"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AdminAppShell>
  );
}
