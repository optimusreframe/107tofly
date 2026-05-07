import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useAuth } from "@/hooks/use-auth";
import { fetchPracticeQuestions, submitQuizAttempt, createFlashcardFromQuestion, getStudentTopicMastery } from "@/server/study.functions";
import { Check, X, Sparkles, BookmarkPlus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/practice")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode as string | undefined) === "weak" ? "weak" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Práctica — 107toFly" },
      { name: "description", content: "Quiz interactivo Part 107 con explicaciones y fuente oficial." },
    ],
  }),
  component: Practice,
});

interface Q {
  id: string;
  topic: string;
  acs_code: string;
  source: string;
  question: string;
  options: string[];
  explanation: string;
  common_mistake: string | null;
  correct_index: number;
}

function Practice() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const search = Route.useSearch();
  const fetchQ = useServerFn(fetchPracticeQuestions);
  const fetchMastery = useServerFn(getStudentTopicMastery);
  const submit = useServerFn(submitQuizAttempt);
  const saveFC = useServerFn(createFlashcardFromQuestion);

  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ question_id: string; selected_index: number; is_correct: boolean }[]>([]);
  const [done, setDone] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [startedAt] = useState(Date.now());

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      let topic: string | undefined;
      if (search.mode === "weak") {
        try {
          const m = await fetchMastery();
          const weak = m.filter((x) => x.hasData && x.status === "weak").sort((a, b) => a.mastery - b.mastery)[0];
          topic = weak?.topic;
        } catch { /* fallback random */ }
      }
      const qs = await fetchQ({ data: topic ? { limit: 10, topic: topic as never } : { limit: 10 } });
      setQuestions(qs as Q[]);
    };
    load();
  }, [user, fetchQ, fetchMastery, search.mode]);

  if (loading || !user) return <StudentAppShell><div className="mx-auto max-w-3xl px-6 pt-24 text-muted-foreground">Cargando…</div></StudentAppShell>;

  if (done) {
    return (
      <StudentAppShell>
        <section className="mx-auto max-w-2xl px-6 pt-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--gradient-aurora)] text-primary-foreground">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold">Quiz completado</h1>
          <div className="mt-6 font-display text-6xl font-semibold text-gradient">{Math.round(done.score)}%</div>
          <p className="mt-2 text-muted-foreground">{done.correct} de {done.total} correctas</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">Ir al Dashboard</Link>
            <button onClick={() => location.reload()} className="rounded-full border border-border bg-card/60 px-5 py-2.5 text-sm">Otra ronda</button>
          </div>
        </section>
      </StudentAppShell>
    );
  }

  if (!questions.length) return <StudentAppShell><div className="mx-auto max-w-3xl px-6 pt-24 text-muted-foreground">Cargando preguntas…</div></StudentAppShell>;

  const q = questions[idx];
  const isCorrect = picked !== null && picked === q.correct_index;

  const next = async () => {
    if (picked === null) return;
    const newAnswers = [...answers, { question_id: q.id, selected_index: picked, is_correct: picked === q.correct_index }];
    setAnswers(newAnswers);
    if (idx + 1 >= questions.length) {
      const res = await submit({ data: { mode: "practice", duration_sec: Math.round((Date.now() - startedAt) / 1000), answers: newAnswers } });
      setDone({ score: res.score, correct: res.correct, total: res.total });
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  };

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-2xl px-6 pt-12">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase tracking-wider">Práctica · {q.topic}</span>
          <span>{idx + 1} / {questions.length}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-[var(--gradient-sky)] transition-all" style={{ width: `${((idx) / questions.length) * 100}%` }} />
        </div>

        <div className="glass-strong mt-6 rounded-3xl p-6 shadow-glass md:p-8">
          <div className="text-xs font-medium text-primary">{q.acs_code} · {q.source}</div>
          <h2 className="mt-2 font-display text-xl font-semibold leading-snug md:text-2xl">{q.question}</h2>

          <div className="mt-5 grid gap-2">
            {q.options.map((opt, i) => {
              const sel = picked === i;
              const reveal = picked !== null;
              const correct = i === q.correct_index;
              return (
                <button
                  key={i}
                  disabled={picked !== null}
                  onClick={() => setPicked(i)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    reveal && correct ? "border-success bg-success/10"
                    : reveal && sel && !correct ? "border-destructive bg-destructive/10"
                    : sel ? "border-primary bg-primary/10"
                    : "border-border bg-card/60 hover:bg-accent"
                  }`}
                >
                  <span>{opt}</span>
                  {reveal && correct && <Check className="h-4 w-4 text-success" />}
                  {reveal && sel && !correct && <X className="h-4 w-4 text-destructive" />}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="mt-5 rounded-2xl border border-border bg-card/70 p-4 text-sm">
              <div className={`text-xs font-medium uppercase tracking-wider ${isCorrect ? "text-success" : "text-destructive"}`}>
                {isCorrect ? "Correcto" : "No exactamente"}
              </div>
              <p className="mt-2 text-foreground">{q.explanation}</p>
              {q.common_mistake && (
                <p className="mt-2 text-muted-foreground"><span className="font-medium">Error común:</span> {q.common_mistake}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => saveFC({ data: { question_id: q.id } })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs hover:bg-accent"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" /> Guardar como flashcard
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={next}
              disabled={picked === null}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
            >
              {idx + 1 >= questions.length ? "Terminar" : "Siguiente"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </StudentAppShell>
  );
}
