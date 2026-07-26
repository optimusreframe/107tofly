import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, RotateCcw, Sparkles, Trophy, ArrowRight } from "lucide-react";
import {
  getLessonQuiz,
  getLessonQuizStatus,
  submitLessonQuizAttempt,
  createFlashcardsFromMissed,
} from "@/lib/lesson-quiz.functions";

type Question = Awaited<ReturnType<typeof getLessonQuiz>>["questions"][number];
type Status = Awaited<ReturnType<typeof getLessonQuizStatus>>;
type SubmitResult = Awaited<ReturnType<typeof submitLessonQuizAttempt>>;

export function LessonDailyQuiz({ slug, locale }: { slug: string; locale: "en" | "es" }) {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [fallback, setFallback] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [phase, setPhase] = useState<"idle" | "active" | "done">("idle");
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fcMsg, setFcMsg] = useState<string | null>(null);
  const [startTs, setStartTs] = useState<number>(0);

  const refresh = async () => {
    setLoading(true);
    const [q, s] = await Promise.all([
      getLessonQuiz({ data: { slug, locale } }),
      getLessonQuizStatus({ data: { slug } }),
    ]);
    setQuestions(q.questions as Question[]);
    setFallback(q.fallback);
    setStatus(s);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [slug, locale]);

  const start = () => {
    setPhase("active");
    setIdx(0);
    setPicks({});
    setResult(null);
    setStartTs(Date.now());
  };

  const current = questions[idx];

  const onPick = (qid: string, choice: number) => {
    setPicks((p) => ({ ...p, [qid]: choice }));
  };

  const onNext = async () => {
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      return;
    }
    // submit — server evaluates authoritatively.
    setSubmitting(true);
    try {
      const answers = questions.map((q) => ({
        question_id: q.id,
        selected_index: Math.max(0, picks[q.id] ?? -1),
      }));
      const res = await submitLessonQuizAttempt({
        data: {
          lesson_slug: slug,
          duration_sec: Math.round((Date.now() - startTs) / 1000),
          answers,
        },
      });
      setResult(res);
      setPhase("done");
      const s = await getLessonQuizStatus({ data: { slug } });
      setStatus(s);
    } finally {
      setSubmitting(false);
    }
  };

  const resultByQid = new Map((result?.results ?? []).map((r) => [r.question_id, r]));
  const missedIds = (result?.results ?? []).filter((r) => !r.is_correct).map((r) => r.question_id);

  const onSaveMissed = async () => {
    if (missedIds.length === 0) return;
    const r = await createFlashcardsFromMissed({ data: { question_ids: missedIds } });
    setFcMsg(t("dailyQuiz.flashcardsCreated", { n: r.created }));
  };

  if (loading) {
    return <div className="glass mt-10 rounded-3xl p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="glass mt-10 rounded-3xl p-6">
        <h2 className="font-display text-xl font-semibold">{t("dailyQuiz.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("dailyQuiz.unavailable")}</p>
      </div>
    );
  }

  return (
    <section className="glass-strong mt-10 rounded-3xl p-6 md:p-8 shadow-glass" aria-labelledby="daily-quiz-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> {t("dailyQuiz.eyebrow")}
          </div>
          <h2 id="daily-quiz-title" className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            {t("dailyQuiz.title")}
          </h2>
        </div>
        {status && status.attempts_count > 0 && (
          <div className="rounded-2xl bg-accent px-3 py-2 text-right text-xs">
            <div className="font-medium">{t("dailyQuiz.bestScore")}: {status.best_score}%</div>
            <div className="text-muted-foreground">{t("dailyQuiz.attempts", { n: status.attempts_count })}</div>
          </div>
        )}
      </div>

      {fallback && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
          {t("dailyQuiz.fallback")}
        </div>
      )}

      {phase === "idle" && (
        <div className="mt-6">
          <p className="text-muted-foreground">{t("dailyQuiz.intro")}</p>
          <button
            onClick={start}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            {status?.attempts_count ? t("dailyQuiz.retake") : t("dailyQuiz.start")}
          </button>
        </div>
      )}

      {phase === "active" && current && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("dailyQuiz.questionXofY", { i: idx + 1, n: questions.length })}</span>
            {current.acs_code && <span className="rounded-full bg-accent px-2 py-0.5">{current.acs_code}</span>}
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-[var(--gradient-sky)] transition-all" style={{ width: `${((idx) / questions.length) * 100}%` }} />
          </div>
          <p className="text-base font-medium md:text-lg">{current.question}</p>
          <div className="mt-4 grid gap-2">
            {(current.options as string[]).map((opt, i) => {
              const picked = picks[current.id] === i;
              return (
                <button
                  key={i}
                  onClick={() => onPick(current.id, i)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    picked ? "border-foreground bg-accent" : "border-border hover:border-foreground/40"
                  }`}
                >
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("dailyQuiz.answerAllHint", { defaultValue: "Se revelan al finalizar." })}</span>
            <button
              onClick={onNext}
              disabled={submitting || picks[current.id] === undefined}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {idx < questions.length - 1 ? t("dailyQuiz.next") : submitting ? t("dailyQuiz.finishing") : t("dailyQuiz.finish")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {phase === "done" && result && (
        <div className="mt-6" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${result.passed ? "bg-success/15 text-success" : "bg-muted text-foreground"}`}>
              <Trophy className="h-4 w-4" />
              {result.score}% · {t("dailyQuiz.correctOf", { c: result.correct, n: result.total })}
            </div>
            <span className="text-xs text-muted-foreground">
              {result.passed ? t("dailyQuiz.passed") : t("dailyQuiz.needsReview")}
            </span>
            {result.xp_awarded_now > 0 && (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                +{result.xp_awarded_now} XP
              </span>
            )}
          </div>

          <div className="mt-6 space-y-4">
            {questions.map((q, qi) => {
              const r = resultByQid.get(q.id);
              const picked = picks[q.id];
              return (
                <div key={q.id} className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{qi + 1}. {q.acs_code}</span>
                    <span className={r?.is_correct ? "text-success" : "text-destructive"}>
                      {r?.is_correct ? t("dailyQuiz.correct") : t("dailyQuiz.incorrect")}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{q.question}</p>
                  <div className="mt-3 grid gap-1.5">
                    {(q.options as string[]).map((opt, i) => {
                      const isCorrect = r?.correct_index === i;
                      const isPicked = picked === i;
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                            isCorrect ? "border-success bg-success/10"
                              : isPicked ? "border-destructive bg-destructive/10"
                              : "border-border"
                          }`}
                        >
                          <span>
                            <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                            {opt}
                          </span>
                          {isCorrect && <CheckCircle2 className="h-4 w-4 text-success" />}
                          {isPicked && !isCorrect && <XCircle className="h-4 w-4 text-destructive" />}
                        </div>
                      );
                    })}
                  </div>
                  {r?.explanation && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t("dailyQuiz.explanation")}: </span>
                      {r.explanation}
                    </p>
                  )}
                  {r?.common_mistake && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t("dailyQuiz.commonMistake")}: </span>
                      {r.common_mistake}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={start}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <RotateCcw className="h-4 w-4" /> {t("dailyQuiz.retake")}
            </button>
            {missedIds.length > 0 && (
              <button
                onClick={onSaveMissed}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                {t("dailyQuiz.saveMissed", { n: missedIds.length })}
              </button>
            )}
          </div>
          {fcMsg && <p className="mt-2 text-xs text-muted-foreground">{fcMsg}</p>}
        </div>
      )}
    </section>
  );
}
