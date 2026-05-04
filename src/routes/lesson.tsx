import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useState } from "react";
import {
  CheckCircle2,
  Sparkles,
  BookOpen,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/lesson")({
  head: () => ({
    meta: [
      { title: "Class B Airspace · Lección — 107toFly" },
      { name: "description", content: "Lección interactiva sobre Class B y autorizaciones LAANC." },
    ],
  }),
  component: Lesson,
});

const blocks = [
  {
    type: "intro",
    title: "¿Qué es Class B airspace?",
    body:
      "Class B rodea los aeropuertos más concurridos de EE.UU. (Atlanta, LAX, JFK…). Tiene forma de pastel invertido con capas que suelen ir desde la superficie hasta 10,000 ft MSL.",
  },
  {
    type: "visual",
    title: "Estructura típica",
    body:
      "Imagina anillos concéntricos: el central toca el suelo, los exteriores empiezan a 1,500 / 3,000 ft. Todos los pisos y techos vienen marcados en la sectional como 100/SFC, 100/30, etc. (cientos de pies MSL).",
  },
  {
    type: "rule",
    title: "Regla de oro · 14 CFR 107.41",
    body:
      "Ningún Remote PIC puede operar en Class B, C, D ni en la superficie de Class E sin autorización ATC previa. La forma rápida y gratis: LAANC.",
  },
  {
    type: "mistake",
    title: "Error común",
    body:
      "Pensar que “debajo del piso” no requiere autorización. Correcto: si el piso es 30 (3,000 ft MSL) y vuelas a 200 ft AGL, NO necesitas autorización para Class B. Pero sí debes confirmar que no estés en Class D o E surface debajo.",
  },
  {
    type: "check",
    title: "Checkpoint",
    body: "Estás en una zona marcada 70/SFC. ¿Puedes operar a 300 ft AGL sin autorización?",
    options: [
      "Sí, 300 ft AGL siempre está permitido bajo Part 107",
      "No, el piso es la superficie: necesitas autorización ATC",
      "Sí, mientras tengas Remote ID activo",
    ],
    correct: 1,
    explanation:
      "El segundo número marca el piso. SFC = Surface, así que el espacio controlado llega al suelo. Necesitas autorización ATC (LAANC).",
  },
];

function Lesson() {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const total = blocks.length;
  const b = blocks[step];
  const progress = ((step + 1) / total) * 100;

  const goNext = () => {
    setPicked(null);
    setStep((s) => Math.min(total - 1, s + 1));
  };
  const goPrev = () => {
    setPicked(null);
    setStep((s) => Math.max(0, s - 1));
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-6 pt-12 md:pt-16">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Semana 2 · Día 9</span>
          <span>{step + 1} / {total}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-[var(--gradient-sky)] transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs">
          <BookOpen className="h-3.5 w-3.5" /> Fuente: Remote Pilot Study Guide · 14 CFR 107.41
        </div>

        <div className="glass-strong mt-5 rounded-3xl p-7 shadow-glass min-h-[320px]">
          {b.type === "rule" && (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Regla clave
            </div>
          )}
          {b.type === "mistake" && (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Error común
            </div>
          )}
          <h2 className="font-display text-2xl font-semibold leading-snug md:text-3xl">{b.title}</h2>
          <p className="mt-3 text-muted-foreground">{b.body}</p>

          {b.type === "visual" && (
            <div className="mt-6 grid gap-2">
              {[
                { l: "Capa exterior", piso: "30", techo: "100" },
                { l: "Capa media", piso: "15", techo: "100" },
                { l: "Capa central", piso: "SFC", techo: "100" },
              ].map((c) => (
                <div key={c.l} className="flex items-center justify-between rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm">
                  <span>{c.l}</span>
                  <span className="font-mono text-muted-foreground">{c.techo} / {c.piso}</span>
                </div>
              ))}
            </div>
          )}

          {b.type === "check" && b.options && (
            <div className="mt-5 grid gap-2">
              {b.options.map((opt, i) => {
                const show = picked !== null;
                const isC = i === b.correct;
                const isP = picked === i;
                return (
                  <button
                    key={i}
                    disabled={show}
                    onClick={() => setPicked(i)}
                    className={`flex items-center justify-between rounded-2xl border border-border bg-card/60 px-4 py-3 text-left text-sm transition ${
                      !show ? "hover:border-primary/40 hover:bg-accent" : isC ? "border-success/60 bg-success/10" : isP ? "border-destructive/60 bg-destructive/10" : "opacity-60"
                    }`}
                  >
                    <span>{opt}</span>
                    {show && isC && <CheckCircle2 className="h-4 w-4 text-success" />}
                  </button>
                );
              })}
              {picked !== null && (
                <div className="mt-3 rounded-2xl border border-border bg-accent/40 p-4 text-sm">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <Sparkles className="h-4 w-4 text-primary" /> FlyCoach explica
                  </div>
                  <p className="text-muted-foreground">{b.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-2 text-sm transition hover:bg-accent disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Anterior
          </button>
          {step < total - 1 ? (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Siguiente <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-success px-5 py-2 text-sm font-medium text-success-foreground transition hover:opacity-90"
            >
              Completar lección <CheckCircle2 className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>
    </PageShell>
  );
}
