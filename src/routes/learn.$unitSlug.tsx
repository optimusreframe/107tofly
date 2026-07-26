import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getUnitBySlug } from "@/lib/learning-units.functions";
import { startSession, submitExercise, endSession, reportExercise } from "@/lib/session-player.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Flag } from "lucide-react";
import { toast } from "sonner";
import { ExerciseView } from "@/components/ExerciseView";

export const Route = createFileRoute("/learn/$unitSlug")({
  head: ({ params }) => ({
    meta: [
      { title: `Learn: ${params.unitSlug} — 107toFly` },
      { name: "description", content: "Session Player: practice concepts with spaced repetition." },
    ],
  }),
  component: LearnUnit,
});

type Ex = { id: string; concept_id: string; kind: string; payload: any; difficulty: number };

function LearnUnit() {
  const { unitSlug } = Route.useParams();
  const navigate = useNavigate();
  const getUnit = useServerFn(getUnitBySlug);
  const startFn = useServerFn(startSession);
  const submitFn = useServerFn(submitExercise);
  const endFn = useServerFn(endSession);
  const reportFn = useServerFn(reportExercise);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<{ id: string; title: string; summary: string | null } | null>(null);
  const [exercises, setExercises] = useState<Ex[]>([]);
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string | null; answer: any } | null>(null);
  const [pick, setPick] = useState<any>(null);
  const [summary, setSummary] = useState<{ total: number; correct: number; score: number; passed: boolean; xpAwarded: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const { unit } = await getUnit({ data: { slug: unitSlug } });
        if (!unit) { setError("Unit not found"); setLoading(false); return; }
        const started = await startFn({ data: { unitId: unit.id } });
        setUnit({ id: unit.id, title: unit.title, summary: unit.summary });
        setExercises(started.exercises as Ex[]);
        setLoading(false);
        setStartedAt(Date.now());
      } catch (e: any) {
        setError(e?.message ?? "Failed to load session");
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <StudentAppShell><div className="mx-auto max-w-3xl p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading session…</div></StudentAppShell>;
  }
  if (error) {
    return <StudentAppShell><div className="mx-auto max-w-3xl p-8 text-destructive">{error}</div></StudentAppShell>;
  }
  if (summary) {
    return (
      <StudentAppShell>
        <section className="mx-auto max-w-2xl p-8">
          <h1 className="text-2xl font-semibold mb-2">Session complete</h1>
          <p className="text-muted-foreground mb-6">{unit?.title}</p>
          <Card className="p-6 space-y-3">
            <div className="text-4xl font-bold">{summary.score}%</div>
            <div className="text-sm text-muted-foreground">{summary.correct} / {summary.total} correct</div>
            {summary.xpAwarded > 0 && <div className="text-sm text-primary">+{summary.xpAwarded} XP</div>}
            <div className="pt-4 flex gap-2">
              <Button onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>Practice again</Button>
            </div>
          </Card>
        </section>
      </StudentAppShell>
    );
  }
  if (exercises.length === 0) {
    return <StudentAppShell><div className="mx-auto max-w-3xl p-8 text-muted-foreground">No exercises in this unit yet.</div></StudentAppShell>;
  }

  const current = exercises[idx];
  const progress = Math.round((idx / exercises.length) * 100);

  async function commit() {
    if (pick == null || !current) return;
    setSubmitting(true);
    try {
      const r = await submitFn({
        data: {
          exerciseId: current.id,
          unitId: unit!.id,
          pick,
          latencyMs: Date.now() - startedAt,
        },
      });
      setFeedback({ correct: r.correct, explanation: r.explanation, answer: r.answer });
      if (r.correct) toast.success("Correct");
      else toast.error("Not quite");
    } catch (e: any) {
      toast.error(e?.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function next() {
    setFeedback(null); setPick(null); setStartedAt(Date.now());
    if (idx + 1 >= exercises.length) {
      const s = await endFn({ data: { unitId: unit!.id } });
      setSummary(s);
    } else {
      setIdx(idx + 1);
    }
  }

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-2xl p-6 md:p-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-primary mb-1">{unit?.title}</div>
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
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={async () => {
                if (!current || !unit) return;
                const note = window.prompt("Report an issue with this exercise (optional):") ?? undefined;
                try {
                  await reportFn({ data: { exerciseId: current.id, unitId: unit.id, note } });
                  toast.success("Thanks — reported");
                } catch (e: any) {
                  toast.error(e?.message ?? "Report failed");
                }
              }}
            >
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
