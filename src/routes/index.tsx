import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plane,
  Map,
  CloudSun,
  Brain,
  Award,
  Sparkles,
  Compass,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { QuizDemo } from "@/components/QuizDemo";
import { getPublicLandingSections } from "@/server/admin.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "107toFly — Master FAA Part 107. Fly with confidence." },
      {
        name: "description",
        content:
          "Plataforma premium para preparar el examen FAA Part 107. Lecciones interactivas, simuladores UAG, FlyCoach AI y certificado interno alineado al ACS.",
      },
      { property: "og:title", content: "107toFly — From zero to Remote Pilot ready" },
      {
        property: "og:description",
        content:
          "Aprende, practica, repite y vuela. Curso de 4 semanas con FlyCoach AI y simulador UAG.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: Compass,
    title: "Curso 4 semanas",
    desc: "Ruta diaria de 2 h con microlecciones, ejemplos guiados y quizzes alineados al ACS.",
  },
  {
    icon: Map,
    title: "Map Lab interactivo",
    desc: "Domina sectional charts, Class B/C/D/E/G, MSL vs AGL y autorizaciones LAANC.",
  },
  {
    icon: CloudSun,
    title: "Weather Lab",
    desc: "Decodifica METAR y TAF visualmente. Simula viento, ceiling y density altitude.",
  },
  {
    icon: Brain,
    title: "FlyCoach AI",
    desc: "Tutor que explica, repregunta y crea mnemotecnias usando solo fuentes oficiales FAA.",
  },
  {
    icon: Sparkles,
    title: "Spaced repetition",
    desc: "Tus errores se convierten en flashcards inteligentes que vuelven justo a tiempo.",
  },
  {
    icon: Award,
    title: "Certificado interno",
    desc: "Course Completion alineado al ACS. No reemplaza el certificado oficial FAA.",
  },
];

const modules = [
  "Regulaciones Part 107",
  "Remote ID y registro",
  "Espacio aéreo (NAS)",
  "Sectional charts",
  "Clima y METAR/TAF",
  "Loading & Performance",
  "Operaciones y comunicaciones",
  "ADM y factores humanos",
  "Emergencias",
  "Mantenimiento y preflight",
];

function Index() {
  return (
    <PageShell>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-success" >
                <CheckCircle2 className="h-3 w-3 text-success-foreground" />
              </span>
              Alineado al FAA ACS · Part 107
            </div>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              From zero to{" "}
              <span className="text-gradient">Remote Pilot</span>
              <br />
              ready.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Aprende, practica, falla, entiende, repite. 107toFly es tu copiloto
              app-like para dominar el examen FAA Part 107 con confianza.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/course"
                className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-elevated transition hover:opacity-90"
              >
                Empezar lección gratis
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/simulator"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-3 text-sm font-medium backdrop-blur transition hover:bg-accent"
              >
                Probar readiness quiz
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <div>
                <div className="font-display text-xl font-semibold text-foreground">28</div>
                días de ruta
              </div>
              <div>
                <div className="font-display text-xl font-semibold text-foreground">600+</div>
                preguntas ACS
              </div>
              <div>
                <div className="font-display text-xl font-semibold text-foreground">10</div>
                módulos oficiales
              </div>
            </div>
          </div>

          {/* Hero card mock */}
          <div className="relative">
            <div className="glass-strong rounded-3xl p-5 shadow-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Readiness Score</div>
                  <div className="font-display text-3xl font-semibold">87<span className="text-base text-muted-foreground">/100</span></div>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--gradient-sky)] text-primary-foreground animate-float-slow">
                  <Plane className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Mapas", v: 92, c: "bg-primary" },
                  { label: "Clima", v: 78, c: "bg-sky" },
                  { label: "Reglas", v: 85, c: "bg-success" },
                ].map((r) => (
                  <div key={r.label} className="rounded-2xl border border-border bg-card/70 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.label}</div>
                    <div className="font-display text-lg font-semibold">{r.v}%</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${r.c}`} style={{ width: `${r.v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-border bg-card/70 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> FlyCoach sugiere
                </div>
                <p className="mt-1 text-sm">
                  Repasa <span className="font-medium">TAF interpretation</span> · 8 flashcards vencen hoy.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-border bg-card/90 p-3 shadow-glass backdrop-blur md:block">
              <div className="flex items-center gap-2 text-xs">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-success/15 text-success">🔥</span>
                <div>
                  <div className="font-medium">12 días streak</div>
                  <div className="text-muted-foreground">+240 XP esta semana</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto mt-28 max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Diseñado para que <span className="text-gradient">entiendas</span>, no solo memorices.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Cada lección, quiz y simulación se mapea a las fuentes oficiales FAA: ACS,
            Remote Pilot Study Guide, Testing Supplement, AC 107-2A y 14 CFR Part 107 / 89.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group glass rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--gradient-sky)] text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quiz Demo */}
      <section className="mx-auto mt-28 max-w-6xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-primary">
              Demo interactivo
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Pregunta real estilo UAG.
              <br />Sin ayuda, sin trampa.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Cada pregunta lleva su código ACS, fuente oficial y explicación inmediata
              del FlyCoach. Falla sin miedo: aquí es donde se aprende.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Banco de preguntas mapeado al ACS",
                "Explicación + por qué las otras opciones fallan",
                "Convierte errores en flashcards automáticamente",
              ].map((l) => (
                <li key={l} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> {l}
                </li>
              ))}
            </ul>
          </div>
          <QuizDemo />
        </div>
      </section>

      {/* Modules */}
      <section className="mx-auto mt-28 max-w-6xl px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          10 módulos. Todo el temario oficial.
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {modules.map((m, i) => (
            <div
              key={m}
              className="glass rounded-2xl p-4 transition hover:border-primary/40"
            >
              <div className="font-mono text-xs text-muted-foreground">M{String(i + 1).padStart(2, "0")}</div>
              <div className="mt-1 font-medium leading-snug">{m}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-28 max-w-6xl px-6">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-10 text-center shadow-elevated md:p-16">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[var(--gradient-aurora)] opacity-20" />
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-5xl">
            Tu copiloto para aprobar la <span className="text-gradient">Part 107</span>.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Empieza hoy con una lección gratis. Sin tarjeta. Sin ruido.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/course"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
            >
              Comenzar curso <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/flycoach"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-6 py-3 text-sm font-medium backdrop-blur transition hover:bg-accent"
            >
              Conocer FlyCoach AI
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
