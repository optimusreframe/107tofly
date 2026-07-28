import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitLabAnswer, completeLabChallenge } from "@/lib/lab-sessions.functions";

export type LabItem = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export function LabChallenge({ labId, title, items }: { labId: string; title: string; items: LabItem[] }) {
  const submit = useServerFn(submitLabAnswer);
  const complete = useServerFn(completeLabChallenge);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [done, setDone] = useState<null | { score: number; xpAwarded: number; alreadyCompleted: boolean }>(null);

  if (items.length === 0) return null;
  const item = items[idx];

  const choose = async (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const isCorrect = i === item.correctIndex;
    if (isCorrect) setCorrectCount((c) => c + 1);
    try {
      await submit({ data: { labId, itemId: item.id, correct: isCorrect, latencyMs: Date.now() - startedAt } });
    } catch (e) { /* swallow: lab is best-effort */ void e; }
  };

  const next = async () => {
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setPicked(null);
      setStartedAt(Date.now());
      return;
    }
    try {
      const r = await complete({ data: { labId, total: items.length, correct: correctCount } });
      setDone(r);
      if (r.alreadyCompleted) toast.info("Ya completaste este lab hoy — sin XP extra.");
      else if (r.xpAwarded) toast.success(`+${r.xpAwarded} XP`);
    } catch (e) { toast.error((e as Error).message); }
  };

  const restart = () => {
    setIdx(0); setPicked(null); setCorrectCount(0); setDone(null); setStartedAt(Date.now());
  };

  if (done) {
    return (
      <div className="glass-strong rounded-3xl p-6 shadow-glass">
        <div className="text-xs uppercase tracking-wider text-primary">{title}</div>
        <div className="mt-2 font-display text-3xl font-semibold">{done.score}%</div>
        <p className="mt-1 text-sm text-muted-foreground">
          {correctCount} de {items.length} correctas
          {done.xpAwarded > 0 ? ` · +${done.xpAwarded} XP` : done.alreadyCompleted ? " · ya reclamado hoy" : ""}
        </p>
        <Button size="sm" variant="outline" className="mt-4" onClick={restart}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Repetir
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-3xl p-5 shadow-glass">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{title}</span>
        <span>{idx + 1} / {items.length}</span>
      </div>
      <p className="mt-3 text-sm font-medium">{item.prompt}</p>
      <div className="mt-3 space-y-2">
        {item.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = picked !== null && i === item.correctIndex;
          const isWrong = isPicked && i !== item.correctIndex;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={picked !== null}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                isCorrect ? "border-success bg-success/10" :
                isWrong ? "border-destructive bg-destructive/10" :
                "border-border hover:bg-accent/60"
              } ${picked !== null && !isPicked && !isCorrect ? "opacity-60" : ""}`}
            >
              <span>{opt}</span>
              {isCorrect && <Check className="h-4 w-4 text-success" />}
              {isWrong && <X className="h-4 w-4 text-destructive" />}
            </button>
          );
        })}
      </div>
      {picked !== null && item.explanation && (
        <div className="mt-3 rounded-2xl border border-border bg-accent/40 p-3 text-xs">
          <div className="mb-1 flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> FlyCoach
          </div>
          <p className="text-muted-foreground">{item.explanation}</p>
        </div>
      )}
      {picked !== null && (
        <Button size="sm" className="mt-3 w-full" onClick={next}>
          {idx + 1 < items.length ? "Siguiente" : "Terminar"}
        </Button>
      )}
    </div>
  );
}
