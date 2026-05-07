import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { fetchDueFlashcards, gradeFlashcard } from "@/server/study.functions";
import { RotateCcw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — 107toFly" },
      { name: "description", content: "Spaced repetition con tarjetas Part 107 (algoritmo SM-2)." },
    ],
  }),
  component: Flashcards,
});

type Grade = "again" | "hard" | "good" | "easy";
interface Card { id: string; front: string; back: string; topic: string | null; due_date: string; interval_days: number }

function Flashcards() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fetchDue = useServerFn(fetchDueFlashcards);
  const grade = useServerFn(gradeFlashcard);

  const [cards, setCards] = useState<Card[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchDue().then((d) => setCards(d as Card[]));
  }, [user, fetchDue]);

  const reset = () => { fetchDue().then((d) => { setCards(d as Card[]); setIdx(0); setFlipped(false); setReviewed(0); }); };

  const submit = async (g: Grade) => {
    if (!cards || idx >= cards.length) return;
    const card = cards[idx];
    await grade({ data: { flashcard_id: card.id, grade: g } });
    setReviewed((n) => n + 1);
    setFlipped(false);
    if (idx + 1 < cards.length) setIdx(idx + 1);
    else setIdx(cards.length);
  };

  // Keyboard shortcuts: Space = flip, 1-4 = grade
  useEffect(() => {
    if (!cards || cards.length === 0 || idx >= cards.length) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
        return;
      }
      if (!flipped) return;
      const map: Record<string, Grade> = { "1": "again", "2": "hard", "3": "good", "4": "easy" };
      const g = map[e.key];
      if (g) {
        e.preventDefault();
        void submit(g);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards, idx, flipped]);

  if (loading || !user || cards === null) {
    return <PageShell><div className="mx-auto max-w-2xl px-6 pt-24 text-muted-foreground">Cargando…</div></PageShell>;
  }


  const done = idx >= cards.length;

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl px-6 pt-12 md:pt-16">
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">{cards.length === 0 ? "Sin tarjetas vencidas" : `Tarjeta ${Math.min(idx + 1, cards.length)} de ${cards.length}`}</div>
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">
            <RotateCcw className="h-3 w-3" /> Recargar
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="glass-strong mt-6 rounded-3xl p-10 text-center shadow-glass">
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 font-display text-2xl font-semibold">No hay tarjetas para hoy</h2>
            <p className="mt-2 text-sm text-muted-foreground">Crea tarjetas desde Práctica guardando preguntas para repaso.</p>
            <Link to="/practice" className="mt-6 inline-flex rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background">Ir a Práctica</Link>
          </div>
        ) : done ? (
          <div className="glass-strong mt-6 rounded-3xl p-10 text-center shadow-glass">
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 font-display text-2xl font-semibold">¡Sesión completada!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Repasaste {reviewed} tarjetas. Próximas vencen según SM-2.</p>
            <Link to="/dashboard" className="mt-6 inline-flex rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background">Ir al Dashboard</Link>
          </div>
        ) : (
          <>
            <button
              onClick={() => setFlipped((f) => !f)}
              className="glass-strong mt-6 grid min-h-[280px] w-full place-items-center rounded-3xl p-10 text-center shadow-glass transition hover:shadow-elevated"
            >
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{flipped ? "Respuesta" : "Pregunta"}</div>
                <div className="mt-3 font-display text-2xl font-semibold leading-snug md:text-3xl">{flipped ? cards[idx].back : cards[idx].front}</div>
                {!flipped && <div className="mt-6 text-xs text-muted-foreground">Toca para ver la respuesta</div>}
              </div>
            </button>
            {flipped && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {([
                  { g: "again" as Grade, l: "Otra vez", c: "bg-destructive text-destructive-foreground" },
                  { g: "hard" as Grade, l: "Difícil", c: "bg-warning text-warning-foreground" },
                  { g: "good" as Grade, l: "Bien", c: "bg-primary text-primary-foreground" },
                  { g: "easy" as Grade, l: "Fácil", c: "bg-success text-success-foreground" },
                ]).map((b) => (
                  <button key={b.g} onClick={() => submit(b.g)} className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition hover:opacity-90 ${b.c}`}>
                    {b.l}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </PageShell>
  );
}
