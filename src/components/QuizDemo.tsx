import { useState } from "react";
import { Check, X, Sparkles, RotateCcw } from "lucide-react";

type Question = {
  id: string;
  topic: string;
  acs: string;
  source: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

const QUESTIONS: Question[] = [
  {
    id: "q1",
    topic: "Espacio aéreo",
    acs: "UA.I.B.K1",
    source: "Remote Pilot Study Guide · 14 CFR 107.41",
    question:
      "Para volar un sUAS en Class B airspace, el Remote PIC debe primero:",
    options: [
      "Notificar al operador del aeropuerto más cercano",
      "Obtener autorización de ATC (LAANC o DroneZone)",
      "Esperar condiciones VFR mínimas",
      "Volar siempre por debajo de 200 ft AGL",
    ],
    correct: 1,
    explanation:
      "Bajo 14 CFR 107.41, ningún Remote PIC puede operar en Class B, C, D, o E lateral surface sin autorización ATC previa. LAANC es el método más rápido.",
  },
  {
    id: "q2",
    topic: "Clima · METAR",
    acs: "UA.II.A.K3",
    source: "AC 00-45 · Aviation Weather Services",
    question:
      "En el METAR: 'KDCA 121651Z 27015G25KT 10SM FEW040 24/12 A3001'. ¿Qué indica '27015G25KT'?",
    options: [
      "Viento de 270° a 15 nudos con ráfagas de 25",
      "Viento variable entre 270° y 150°",
      "Visibilidad 27 km y techo 1500 ft",
      "Temperatura 27°C y dewpoint 15°C",
    ],
    correct: 0,
    explanation:
      "El grupo de viento se lee como dirección/velocidad G ráfaga: 270° true, 15 KT sostenido, ráfagas a 25 KT.",
  },
  {
    id: "q3",
    topic: "Operaciones",
    acs: "UA.III.A.K2",
    source: "14 CFR 107.51",
    question:
      "La altitud máxima permitida para operar un sUAS bajo Part 107, sin estar dentro de 400 ft de una estructura, es:",
    options: [
      "200 ft AGL",
      "400 ft AGL",
      "500 ft MSL",
      "1,200 ft AGL",
    ],
    correct: 1,
    explanation:
      "14 CFR 107.51(b): máximo 400 ft AGL, salvo cuando el sUAS opere dentro de un radio de 400 ft de una estructura, en cuyo caso puede subir 400 ft sobre la estructura.",
  },
];

export function QuizDemo() {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = QUESTIONS[idx];

  const next = () => {
    setPicked(null);
    setIdx((i) => (i + 1) % QUESTIONS.length);
  };

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-6 shadow-elevated md:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
          {q.topic}
        </span>
        <span className="rounded-full bg-accent px-2.5 py-1 font-mono text-accent-foreground">
          ACS {q.acs}
        </span>
        <span className="text-muted-foreground">{q.source}</span>
      </div>
      <h3 className="font-display text-xl font-semibold leading-snug md:text-2xl">
        {q.question}
      </h3>
      <div className="mt-6 grid gap-2.5">
        {q.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === q.correct;
          const showState = picked !== null;
          const base =
            "group flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 text-left text-sm transition";
          const state = !showState
            ? "hover:border-primary/40 hover:bg-accent"
            : isCorrect
            ? "border-success/60 bg-success/10"
            : isPicked
            ? "border-destructive/60 bg-destructive/10"
            : "opacity-60";
          return (
            <button
              key={i}
              disabled={showState}
              onClick={() => setPicked(i)}
              className={`${base} ${state}`}
            >
              <span className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-border bg-background text-xs font-medium">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </span>
              {showState && isCorrect && <Check className="h-4 w-4 text-success" />}
              {showState && isPicked && !isCorrect && (
                <X className="h-4 w-4 text-destructive" />
              )}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mt-5 rounded-2xl border border-border bg-accent/40 p-4 text-sm">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            FlyCoach explica
          </div>
          <p className="text-muted-foreground">{q.explanation}</p>
          <button
            onClick={next}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Siguiente pregunta
          </button>
        </div>
      )}
    </div>
  );
}
