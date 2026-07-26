import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useState, useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveOnboarding } from "@/lib/study.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Bienvenido — 107toFly" },
      { name: "description", content: "Personaliza tu plan de estudio Part 107 en 4 pasos." },
    ],
  }),
  component: Onboarding,
});

const steps = [
  {
    key: "experience",
    q: "¿Cuál es tu experiencia con drones?",
    options: ["Nunca volé", "Recreativo", "Comercial pendiente", "Background aeronáutico"],
  },
  {
    key: "goal",
    q: "¿Cuándo quieres dar el examen?",
    options: ["En 1 semana", "En 4 semanas", "En 2 meses", "Sin fecha aún"],
  },
  {
    key: "time",
    q: "¿Cuánto tiempo puedes dedicar al día?",
    options: ["30 min", "1 hora", "2 horas", "3+ horas"],
  },
  {
    key: "language",
    q: "¿En qué idioma prefieres estudiar?",
    options: ["Español", "English", "Both"],
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const save = useServerFn(saveOnboarding);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const total = steps.length;
  const s = steps[step];
  const done = step >= total;

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!done || saving || !user) return;
    setSaving(true);
    const goalMap: Record<string, number> = { "En 1 semana": 7, "En 4 semanas": 28, "En 2 meses": 60 };
    const days = goalMap[answers.goal];
    const goalDate = days ? new Date(Date.now() + days * 86400000).toISOString().slice(0, 10) : undefined;
    const localeMap: Record<string, string> = { "Español": "es", "English": "en", "Both": "es" };
    save({
      data: {
        experience_level: answers.experience ?? "Nunca volé",
        study_goal_date: goalDate,
        locale: localeMap[answers.language] ?? "es",
      },
    }).catch(() => undefined).finally(() => setSaving(false));
  }, [done, user, answers, save, saving]);

  const pick = (opt: string) => {
    setAnswers((a) => ({ ...a, [s.key]: opt }));
    setTimeout(() => setStep((x) => x + 1), 200);
  };

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-2xl px-6 pt-12 md:pt-20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Onboarding</span>
          <span>{Math.min(step + 1, total)} / {total}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-[var(--gradient-aurora)] transition-all" style={{ width: `${(Math.min(step, total) / total) * 100}%` }} />
        </div>

        {!done ? (
          <div className="glass-strong mt-8 rounded-3xl p-7 shadow-glass">
            <h2 className="font-display text-2xl font-semibold leading-snug md:text-3xl">{s.q}</h2>
            <div className="mt-5 grid gap-2">
              {s.options.map((opt) => {
                const sel = answers[s.key] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => pick(opt)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      sel ? "border-primary bg-primary/10" : "border-border bg-card/60 hover:bg-accent"
                    }`}
                  >
                    <span>{opt}</span>
                    {sel && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="glass-strong mt-8 rounded-3xl p-8 text-center shadow-elevated">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--gradient-aurora)] text-primary-foreground">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold">Tu plan está listo</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Generamos una ruta personalizada basada en tus respuestas. Tu primera lección
              te espera en el Dashboard.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              Ir al Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>
    </StudentAppShell>
  );
}
