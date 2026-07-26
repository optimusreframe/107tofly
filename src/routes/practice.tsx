import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { PracticeSkeleton } from "@/components/PracticeSkeleton";
import { useAuth } from "@/hooks/use-auth";
import { fetchPracticeQuestions, submitQuizAttempt, createFlashcardFromQuestion, getStudentTopicMastery } from "@/lib/study.functions";
import { getDueReview } from "@/lib/session-player.functions";
import { Check, X, Sparkles, BookmarkPlus, ArrowRight, Sparkle } from "lucide-react";

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
}

type SubmitResult = Awaited<ReturnType<typeof submitQuizAttempt>>;

function Practice() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.startsWith("es") ? "es" : "en") as "en" | "es";
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const search = Route.useSearch();
  const fetchQ = useServerFn(fetchPracticeQuestions);
  const fetchMastery = useServerFn(getStudentTopicMastery);
  const submit = useServerFn(submitQuizAttempt);
  const saveFC = useServerFn(createFlashcardFromQuestion);

  const [questions, setQuestions] = useState<Q[]>([]);
  const [fallback, setFallback] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [done, setDone] = useState<SubmitResult | null>(null);
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
      const res = await fetchQ({ data: topic ? { limit: 10, topic: topic as never, locale } : { limit: 10, locale } });
      setQuestions(res.questions as unknown as Q[]);
      setFallback(!!res.fallback);
    };
    load();
  }, [user, fetchQ, fetchMastery, search.mode, locale]);

  if (loading || !user) return <StudentAppShell><PracticeSkeleton /></StudentAppShell>;

  if (done) {
    const resultByQid = new Map(done.results.map((r) => [r.question_id, r]));
    const missed = done.results.filter((r) => !r.is_correct);
    return (
      <StudentAppShell>
        <section className="mx-auto max-w-2xl px-6 pt-16">
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--gradient-aurora)] text-primary-foreground">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold">{t("student.practice.done")}</h1>
            <div className="mt-6 font-display text-6xl font-semibold text-gradient">{Math.round(done.score)}%</div>
            <p className="mt-2 text-muted-foreground">{t("student.practice.doneSummary", { c: done.correct, n: done.total })}</p>
          </div>

          <div className="mt-8 space-y-4">
            {questions.map((q, qi) => {
              const r = resultByQid.get(q.id);
              const picked = picks[q.id];
              return (
                <div key={q.id} className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{qi + 1}. {q.acs_code}</span>
                    <span className={r?.is_correct ? "text-success" : "text-destructive"}>
                      {r?.is_correct ? t("student.practice.correct") : t("student.practice.notQuite")}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{q.question}</p>
                  <div className="mt-3 grid gap-1.5">
                    {q.options.map((opt, i) => {
                      const isCorrect = r?.correct_index === i;
                      const isPicked = picked === i;
                      return (
                        <div key={i} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                          isCorrect ? "border-success bg-success/10"
                          : isPicked ? "border-destructive bg-destructive/10"
                          : "border-border"
                        }`}>
                          <span>{opt}</span>
                          {isCorrect && <Check className="h-4 w-4 text-success" />}
                          {isPicked && !isCorrect && <X className="h-4 w-4 text-destructive" />}
                        </div>
                      );
                    })}
                  </div>
                  {r?.explanation && <p className="mt-2 text-xs text-muted-foreground">{r.explanation}</p>}
                  {!r?.is_correct && (
                    <button
                      onClick={() => saveFC({ data: { question_id: q.id } })}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs hover:bg-accent"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" /> {t("student.practice.saveFlashcard")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">{t("student.practice.goDashboard")}</Link>
            <button onClick={() => location.reload()} className="rounded-full border border-border bg-card/60 px-5 py-2.5 text-sm">{t("student.practice.another")}</button>
          </div>
          {missed.length > 0 && <p className="mt-3 text-center text-xs text-muted-foreground">{t("student.practice.reviewHint", { defaultValue: "Guarda las que fallaste como flashcards." })}</p>}
        </section>
      </StudentAppShell>
    );
  }

  if (!questions.length) return <StudentAppShell><PracticeSkeleton /></StudentAppShell>;

  const q = questions[idx];
  const picked = picks[q.id];

  const next = async () => {
    if (picked === undefined) return;
    if (idx + 1 >= questions.length) {
      const answers = questions.map((qq) => ({
        question_id: qq.id,
        selected_index: picks[qq.id] ?? -1,
      }));
      const res = await submit({ data: { mode: "practice", duration_sec: Math.round((Date.now() - startedAt) / 1000), answers } });
      setDone(res);
    } else {
      setIdx(idx + 1);
    }
  };

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-2xl px-6 pt-12">
        <SessionPlayerEntry />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase tracking-wider">{t("student.practice.label")} · {t(`student.topics.${q.topic}`, { defaultValue: q.topic })}</span>
          <span>{idx + 1} / {questions.length}</span>
        </div>
        {fallback && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
            {t("student.fallbackToEn")}
          </div>
        )}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-[var(--gradient-sky)] transition-all" style={{ width: `${((idx) / questions.length) * 100}%` }} />
        </div>

        <div className="glass-strong mt-6 rounded-3xl p-6 shadow-glass md:p-8">
          <div className="text-xs font-medium text-primary">{q.acs_code} · {q.source}</div>
          <h2 className="mt-2 font-display text-xl font-semibold leading-snug md:text-2xl">{q.question}</h2>

          <div className="mt-5 grid gap-2">
            {q.options.map((opt, i) => {
              const sel = picked === i;
              return (
                <button
                  key={i}
                  onClick={() => setPicks((p) => ({ ...p, [q.id]: i }))}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    sel ? "border-primary bg-primary/10" : "border-border bg-card/60 hover:bg-accent"
                  }`}
                >
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("student.practice.revealHint", { defaultValue: "Se revisan al finalizar." })}</span>
            <button
              onClick={next}
              disabled={picked === undefined}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
            >
              {idx + 1 >= questions.length ? t("student.practice.finish") : t("student.practice.next")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </StudentAppShell>
  );
}
