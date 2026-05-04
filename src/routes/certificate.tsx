import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Award, ShieldCheck, FileCheck2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/certificate")({
  head: () => ({
    meta: [
      { title: "Certificado interno — 107toFly" },
      {
        name: "description",
        content:
          "El 107toFly Course Completion Certificate certifica dominio interno del temario Part 107. No reemplaza el certificado oficial FAA Remote Pilot.",
      },
      { property: "og:title", content: "107toFly Course Completion Certificate" },
      {
        property: "og:description",
        content: "Aprueba el curso interno alineado al ACS y comparte tu logro.",
      },
    ],
  }),
  component: Certificate,
});

const reqs = [
  "100% de módulos obligatorios completados",
  "Todos los quizzes diarios completados",
  "Promedio mínimo general 80%",
  "Dos simulacros completos de 60 preguntas aprobados",
  "Mínimo 85% en el último simulacro recomendado",
  "Cobertura completa de los dominios del ACS",
];

function Certificate() {
  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">
          Course Completion
        </div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-6xl">
          Certificado <span className="text-gradient">interno</span> de aprobación.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Cuando dominas internamente el temario, 107toFly emite tu Course Completion
          Certificate alineado al ACS y al material oficial FAA.
        </p>

        {/* Certificate mock */}
        <div className="mt-12 glass-strong overflow-hidden rounded-3xl shadow-elevated">
          <div className="relative bg-[var(--gradient-aurora)] p-10 text-center text-primary-foreground">
            <div aria-hidden className="absolute inset-0 bg-foreground/30" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-background/20 px-3 py-1 text-xs backdrop-blur">
                <Award className="h-3.5 w-3.5" /> 107toFly · Course Completion
              </div>
              <div className="mt-6 font-display text-sm uppercase tracking-[0.3em] opacity-80">
                This certifies that
              </div>
              <div className="mt-3 font-display text-4xl font-semibold md:text-5xl">
                Your Name Here
              </div>
              <div className="mt-3 max-w-xl mx-auto text-sm opacity-90">
                has successfully completed the 107toFly Part 107 Preparation Program,
                aligned with FAA ACS, Remote Pilot Study Guide and 14 CFR Part 107 / 89.
              </div>
              <div className="mt-8 grid grid-cols-3 gap-6 text-xs">
                <div>
                  <div className="opacity-70">Final Score</div>
                  <div className="font-display text-lg">92%</div>
                </div>
                <div>
                  <div className="opacity-70">Hours</div>
                  <div className="font-display text-lg">56h</div>
                </div>
                <div>
                  <div className="opacity-70">Certificate ID</div>
                  <div className="font-mono text-xs">107F-XXXX-2025</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 border-t border-border bg-card/70 p-5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>
              This certificate is <strong>not</strong> an FAA Remote Pilot Certificate
              and does not replace the official FAA UAG knowledge test or IACRA
              certification process.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 font-display text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-success" /> Requisitos de emisión
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {reqs.map((r) => (
                <li key={r} className="flex gap-2">
                  <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 font-display text-lg font-semibold">
              <Award className="h-5 w-5 text-primary" /> Qué incluye
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• PDF descargable de alta calidad</li>
              <li>• Página pública verificable por ID único</li>
              <li>• Compartir directo en LinkedIn</li>
              <li>• Visible en tu perfil de 107toFly</li>
              <li>• Disclaimer FAA claro y permanente</li>
            </ul>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
