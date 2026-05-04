import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useMemo, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — 107toFly" },
      { name: "description", content: "Spaced repetition con tarjetas oficiales Part 107." },
    ],
  }),
  component: Flashcards,
});

const cards = [
  { front: "Altura máxima Part 107 sobre terreno", back: "400 ft AGL — salvo dentro de 400 ft de una estructura, donde puede subir 400 ft sobre la estructura. (14 CFR 107.51)" },
  { front: "Visibilidad mínima del Remote PIC", back: "3 statute miles desde la control station. (14 CFR 107.51)" },
  { front: "Distancia de las nubes", back: "500 ft por debajo y 2,000 ft horizontal. (14 CFR 107.51)" },
  { front: "¿Qué es LAANC?", back: "Low Altitude Authorization and Notification Capability — autoriza vuelos casi en tiempo real en espacio controlado." },
  { front: "Reportar accidente Part 107", back: "Dentro de 10 días si hay lesión seria, pérdida de consciencia o daño > $500 (excluye sUAS). (107.9)" },
  { front: "Edad mínima Remote Pilot", back: "16 años. (14 CFR 107.61)" },
];

type Grade = "again" | "hard" | "good" | "easy";

function Flashcards() {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [history, setHistory] = useState<{ id: number; grade: Grade }[]>([]);

  const card = cards[idx];
  const remaining = useMemo(() => cards.length - history.length, [history]);

  const grade = (g: Grade) => {
    setHistory((h) => [...h, { id: idx, grade: g }]);
    setFlipped(false);
    setIdx((i) => (i + 1) % cards.length);
  };

  const reset = () => {
    setHistory([]);
    setIdx(0);
    setFlipped(false);
  };

  const done = remaining === 0 && history.length > 0;

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl px-6 pt-12 md:pt-16">
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Tarjeta {Math.min(history.length + 1, cards.length)} de {cards.length}
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        {done ? (
          <div className="glass-strong mt-6 rounded-3xl p-10 text-center shadow-glass">
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 font-display text-2xl font-semibold">¡Sesión completada!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Repasaste {history.length} tarjetas. Tu próxima sesión se programó automáticamente.
            </p>
            <button
              onClick={reset}
              className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
            >
              Repetir
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setFlipped((f) => !f)}
              className="glass-strong mt-6 grid min-h-[280px] w-full place-items-center rounded-3xl p-10 text-center shadow-glass transition hover:shadow-elevated"
            >
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {flipped ? "Respuesta" : "Pregunta"}
                </div>
                <div className="mt-3 font-display text-2xl font-semibold leading-snug md:text-3xl">
                  {flipped ? card.back : card.front}
                </div>
                {!flipped && (
                  <div className="mt-6 text-xs text-muted-foreground">Toca para ver la respuesta</div>
                )}
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
                  <button
                    key={b.g}
                    onClick={() => grade(b.g)}
                    className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition hover:opacity-90 ${b.c}`}
                  >
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
