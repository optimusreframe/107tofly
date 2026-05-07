import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useAuth } from "@/hooks/use-auth";
import { fetchPracticeQuestions, submitExamSimulation } from "@/server/study.functions";
import { Clock, Target, ListChecks, ArrowRight, ArrowLeft, Flag, Sparkles } from "lucide-react";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Simulador UAG — 107toFly" },
      { name: "description", content: "Simulacro completo del examen FAA UAG: 60 preguntas, 2 horas, ponderación por dominios ACS." },
      { property: "og:title", content: "Simulador UAG — 107toFly" },
    ],
  }),
  component: Simulator,
});

interface Q {
  id: string;
  topic: string;
  acs_code: string;
  source: string;
  question: string;
  options: string[];
  explanation: string;
  correct_index: number;
}

const EXAM_LEN = 60;
const EXAM_SECONDS = 2 * 60 * 60;

function Simulator() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fetchQ = useServerFn(fetchPracticeQuestions);
  const submitSim = useServerFn(submitExamSimulation);

  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_SECONDS);
  const [result, setResult] = useState<{ score: number; correct: number; total: number; breakdown: Record<string, { total: number; correct: number }> } | null>(null);
  const startedRef = useRef<number>(0);
  const submittedRef = useRef(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  // timer
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = async () => {
    const qs = (await fetchQ({ data: { limit: EXAM_LEN } })) as Q[];
    setQuestions(qs);
    setPicks({});
    setIdx(0);
    setTimeLeft(EXAM_SECONDS);
    startedRef.current = Date.now();
    submittedRef.current = false;
    setPhase("running");
  };

  const finish = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const answers = questions.map((q, i) => ({
      question_id: q.id,
      topic: q.topic as never,
      selected_index: picks[i] ?? -1,
      is_correct: picks[i] === q.correct_index,
    }));
    const duration = Math.min(EXAM_SECONDS, Math.round((Date.now() - startedRef.current) / 1000));
    const res = await submitSim({ data: { duration_sec: duration, answers } });
    setResult({ score: Number(res.score), correct: res.correct, total: res.total, breakdown: res.breakdown });
    setPhase("done");
  };

  const fmt = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const answered = useMemo(() => Object.keys(picks).length, [picks]);

  if (loading || !user) {
    return <StudentAppShell><div className="mx-auto max-w-3xl px-6 pt-24 text-muted-foreground">{t("common.loading")}</div></StudentAppShell>;
  }

  if (phase === "intro") {
    return (
      <StudentAppShell>
        <section className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
          <div className="text-xs font-medium uppercase tracking-wider text-primary">Exam Simulator</div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-6xl">
            Simula el <span className="text-gradient">UAG</span> real.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            60 preguntas en 2 horas, ponderadas por dominios ACS. Pasa con 70% interno; recomendado 85%+.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: Clock, t: "2 horas", d: "Mismo timing del examen oficial." },
              { icon: ListChecks, t: "60 preguntas", d: "Distribuidas por dominios ACS." },
              { icon: Target, t: "70% mínimo", d: "Recomendamos 85%+ consistente." },
            ].map((s) => (
              <div key={s.t} className="glass rounded-3xl p-5">
                <s.icon className="h-5 w-5 text-primary" />
                <div className="mt-3 font-display text-xl font-semibold">{s.t}</div>
                <div className="text-sm text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <button onClick={start} className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90">
              Comenzar simulacro
            </button>
          </div>
        </section>
      </StudentAppShell>
    );
  }

  if (phase === "done" && result) {
    const passed = result.score >= 70;
    return (
      <StudentAppShell>
        <section className="mx-auto max-w-3xl px-6 pt-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--gradient-aurora)] text-primary-foreground">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold">Simulacro completado</h1>
          <div className="mt-6 font-display text-7xl font-semibold text-gradient">{Math.round(result.score)}%</div>
          <p className="mt-2 text-muted-foreground">{result.correct} de {result.total} correctas · {passed ? "Aprobado interno ✅" : "Sigue practicando"}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {Object.entries(result.breakdown).map(([topic, b]) => {
              const pct = Math.round((b.correct / b.total) * 100);
              return (
                <div key={topic} className="rounded-2xl border border-border bg-card/60 p-4 text-left">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{topic}</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-[var(--gradient-sky)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">Dashboard</Link>
            <Link to="/certificate" className="rounded-full border border-border bg-card/60 px-5 py-2.5 text-sm">Ver certificado</Link>
            <button onClick={start} className="rounded-full border border-border bg-card/60 px-5 py-2.5 text-sm">Otro simulacro</button>
          </div>
        </section>
      </StudentAppShell>
    );
  }

  // running
  const q = questions[idx];
  if (!q) return <StudentAppShell><div className="mx-auto max-w-3xl px-6 pt-24 text-muted-foreground">{t("student.simulator.loading")}</div></StudentAppShell>;

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-3xl px-6 pt-10">
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-wider text-muted-foreground">{q.acs_code} · {q.topic}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${timeLeft < 600 ? "bg-destructive/15 text-destructive" : "bg-card/60 text-foreground border border-border"}`}>
            <Clock className="h-3.5 w-3.5" /> {fmt(timeLeft)}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-[var(--gradient-sky)] transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">Pregunta {idx + 1} / {questions.length} · {answered} contestadas</div>

        <div className="glass-strong mt-5 rounded-3xl p-6 shadow-glass md:p-8">
          <h2 className="font-display text-xl font-semibold leading-snug md:text-2xl">{q.question}</h2>
          <div className="mt-5 grid gap-2">
            {q.options.map((opt, i) => {
              const sel = picks[idx] === i;
              return (
                <button
                  key={i}
                  onClick={() => setPicks({ ...picks, [idx]: i })}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${sel ? "border-primary bg-primary/10" : "border-border bg-card/60 hover:bg-accent"}`}
                >
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}.</span>{opt}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>
            {idx + 1 < questions.length ? (
              <button onClick={() => setIdx(idx + 1)} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background">
                {t("student.simulator.next")} <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={finish} className="inline-flex items-center gap-1.5 rounded-full bg-success px-5 py-2 text-sm font-medium text-success-foreground">
                <Flag className="h-4 w-4" /> Entregar
              </button>
            )}
          </div>
        </div>

        {/* nav grid */}
        <div className="mt-5 grid grid-cols-10 gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`aspect-square rounded-md text-xs font-medium transition ${i === idx ? "bg-foreground text-background" : picks[i] !== undefined ? "bg-primary/30 text-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </section>
    </StudentAppShell>
  );
}
