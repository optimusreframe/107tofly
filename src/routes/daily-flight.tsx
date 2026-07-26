import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { startDailyFlight, submitDailyFlightExercise, endDailyFlight, reportExercise } from "@/lib/session-player.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Flag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ExerciseView } from "@/components/ExerciseView";

export const Route = createFileRoute("/daily-flight")({
  head: () => ({
    meta: [
      { title: "Daily Flight — 107toFly" },
      { name: "description", content: "Adaptive daily mini-session across all concepts due for review." },
    ],
  }),
  component: DailyFlight,
});

type Ex = { id: string; concept_id: string; kind: string; payload: any; difficulty: number; unit_id: string | null };

function DailyFlight() {
  const navigate = useNavigate();
  const startFn = useServerFn(startDailyFlight);
  const submitFn = useServerFn(submitDailyFlightExercise);
  const endFn = useServerFn(endDailyFlight);
  const reportFn = useServerFn(reportExercise);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Ex[]>([]);
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string | null } | null>(null);
  const [summary, setSummary] = useState<{ total: number; correct: number; score: number; passed: boolean; xpAwarded: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const r = await startFn();
        setExercises(r.exercises as Ex[]);
        setLoading(false);
        setStartedAt(Date.now());
      } catch (e: any) {
        setError(e?.message ?? "Failed to load daily flight");
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <StudentAppShell><div className="mx-auto max-w-3xl p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div></StudentAppShell>;
  if (error) return <StudentAppShell><div className="mx-auto max-w-3xl p-8 text-destructive">{error}</div></StudentAppShell>;
  if (summary) {
    return (
      <StudentAppShell>
        <section className="mx-auto max-w-2xl p-8">
          <h1 className="text-2xl font-semibold mb-2">Daily flight complete</h1>
          <Card className="p-6 space-y-3">
            <div className="text-4xl font-bold">{summary.score}%</div>
            <div className="text-sm text-muted-foreground">{summary.correct} / {summary.total} correct</div>
            {summary.xpAwarded > 0 && <div className="text-sm text-primary">+{summary.xpAwarded} XP</div>}
            <div className="pt-4 flex gap-2">
              <Button onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>Fly again</Button>
            </div>
          </Card>
        </section>
      </StudentAppShell>
    );
  }
  if (exercises.length === 0) {
    return <StudentAppShell><div className="mx-auto max-w-3xl p-8 text-muted-foreground">Nothing to review right now. Come back tomorrow!</div></StudentAppShell>;
  }

  const current = exercises[idx];
  const progress = Math.round((idx / exercises.length) * 100);

  async function commit() {
    if (pick == null || !current) return;
    setSubmitting(true);
    try {
      const r = await submitFn({ data: { exerciseId: current.id, pick, latencyMs: Date.now() - startedAt } });
      setFeedback({ correct: r.correct, explanation: r.explanation });
      r.correct ? toast.success("Correct") : toast.error("Not quite");
    } catch (e: any) { toast.error(e?.message ?? "Submit failed"); }
    finally { setSubmitting(false); }
  }

  async function next() {
    setFeedback(null); setPick(null); setStartedAt(Date.now());
    if (idx + 1 >= exercises.length) {
      const s = await endFn();
      setSummary(s);
    } else {
      setIdx(idx + 1);
    }
  }

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-2xl p-6 md:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-1">
            <Sparkles className="h-3 w-3" /> Daily Flight
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{idx + 1} / {exercises.length}</div>
        </div>

        <Card className="p-6 space-y-4">
          <ExerciseView ex={current} pick={pick} setPick={setPick} disabled={!!feedback} />
          {feedback && (
            <div className={`rounded-lg border p-3 text-sm ${feedback.correct ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"}`}>
              <div className="flex items-center gap-2 font-medium">
                {feedback.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {feedback.correct ? "Correct" : "Incorrect"}
              </div>
              {feedback.explanation && <p className="mt-2 text-muted-foreground">{feedback.explanation}</p>}
            </div>
          )}
          <div className="flex justify-between items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground"
              onClick={async () => {
                const note = window.prompt("Report an issue (optional):") ?? undefined;
                try { await reportFn({ data: { exerciseId: current.id, unitId: current.unit_id ?? undefined, note } }); toast.success("Thanks — reported"); }
                catch (e: any) { toast.error(e?.message ?? "Report failed"); }
              }}>
              <Flag className="h-3.5 w-3.5 mr-1" /> Report
            </Button>
            {!feedback ? (
              <Button onClick={commit} disabled={pick == null || submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
              </Button>
            ) : (
              <Button onClick={next}>{idx + 1 >= exercises.length ? "Finish" : "Next"}</Button>
            )}
          </div>
        </Card>
      </section>
    </StudentAppShell>
  );
}
