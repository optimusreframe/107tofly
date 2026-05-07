import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { askFlyCoach } from "@/server/flycoach.functions";
import { usePublicRuntime } from "@/hooks/use-public-runtime";
import { Sparkles, Send, Loader2 } from "lucide-react";

export const Route = createFileRoute("/flycoach")({
  head: () => ({
    meta: [
      { title: "FlyCoach AI — Tutor Part 107 | 107toFly" },
      {
        name: "description",
        content:
          "Tutor IA para FAA Part 107 que cita solo fuentes oficiales (14 CFR, ACS, AIM).",
      },
    ],
  }),
  component: FlyCoach,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "¿Qué dice 14 CFR 107.51 sobre velocidad y altitud?",
  "Decodifica este METAR: KJFK 121751Z 18012KT 10SM FEW050 28/19 A3001",
  "¿Cuándo necesito autorización LAANC?",
  "Explícame Class B vs Class C en términos simples",
];

function FlyCoach() {
  const { t } = useTranslation();
  const ask = useServerFn(askFlyCoach);
  const runtime = usePublicRuntime();
  const flycoachEnabled = runtime?.features.flycoachEnabled !== false;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (runtime && !flycoachEnabled) {
    return (
      <StudentAppShell>
        <section className="mx-auto max-w-2xl px-6 pt-24 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-3xl font-semibold">FlyCoach</h1>
          <p className="mt-3 text-muted-foreground">{t("runtime.flycoachDisabled")}</p>
        </section>
      </StudentAppShell>
    );
  }

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await ask({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "FlyCoach no está disponible. Intenta de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudentAppShell>
      <section className="mx-auto flex max-w-3xl flex-col px-6 pt-12 md:pt-16">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">
          Tutor IA · Part 107
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-5xl">
          <span className="text-gradient">FlyCoach</span>
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Pregunta cualquier cosa del Part 107. Cita siempre la fuente oficial.
        </p>

        <div className="glass-strong mt-6 flex min-h-[60vh] flex-col rounded-3xl p-4 shadow-glass md:p-6">
          <div className="flex-1 space-y-4 overflow-y-auto">
            {messages.length === 0 && (
              <div className="space-y-3 py-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> Sugerencias para empezar
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-2xl border border-border bg-card/60 p-3 text-left text-sm transition hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                    : "max-w-[90%] rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm"
                }
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            ))}

            {loading && (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card/70 px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> FlyCoach está pensando…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card/60 p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregúntale a FlyCoach…"
              className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background transition hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          FlyCoach puede equivocarse. Verifica siempre con la fuente oficial FAA.
        </p>
      </section>
    </StudentAppShell>
  );
}
