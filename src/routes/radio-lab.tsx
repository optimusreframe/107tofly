import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { celebrateCorrect, shakeWrong } from "@/lib/feedback";

export const Route = createFileRoute("/radio-lab")({
  head: () => ({
    meta: [
      { title: "Radio Lab · 107toFly" },
      { name: "description", content: "Practice ATC-style radio calls with voice recognition. Read back clearances aloud and get instant feedback." },
      { property: "og:title", content: "Radio Lab · 107toFly" },
      { property: "og:description", content: "Practice ATC-style radio readbacks with your voice." },
    ],
  }),
  component: RadioLabPage,
});

type Scenario = { id: string; prompt: string; expected: string; hint: string };

const SCENARIOS: Scenario[] = [
  { id: "s1", prompt: "ATC: 'Skyhawk 45G, cleared for takeoff runway 27, wind 260 at 8.'", expected: "cleared for takeoff runway 27 skyhawk 45g", hint: "Read back clearance + runway + callsign." },
  { id: "s2", prompt: "ATC: 'Drone 107, remain clear of Class B, maintain 300 feet AGL.'", expected: "remain clear of class b maintain 300 feet drone 107", hint: "Confirm restriction, altitude, callsign." },
  { id: "s3", prompt: "ATC: 'Drone 107, LAANC authorization approved, contact tower 118.3.'", expected: "laanc approved contact tower 118.3 drone 107", hint: "Confirm authorization + frequency + callsign." },
  { id: "s4", prompt: "ATC: 'Drone 107, hold position, traffic on final.'", expected: "holding position drone 107", hint: "Acknowledge hold + callsign." },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\w\s.]/g, "").replace(/\s+/g, " ").trim();
}

function scoreMatch(expected: string, said: string): number {
  const e = normalize(expected).split(" ");
  const s = new Set(normalize(said).split(" "));
  const hits = e.filter((w) => s.has(w)).length;
  return Math.round((hits / e.length) * 100);
}

function RadioLabPage() {
  const [idx, setIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);
  const sc = SCENARIOS[idx];

  useEffect(() => {
    const SR: any = (typeof window !== "undefined") && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) { setSupported(false); return; }
    const r = new SR();
    r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const said = e.results[0][0].transcript as string;
      setTranscript(said);
      const score = scoreMatch(sc.expected, said);
      const passed = score >= 70;
      setResult({ score, passed });
      if (passed) celebrateCorrect(); else shakeWrong();
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    return () => { try { r.abort(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const speakPrompt = () => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(sc.prompt.replace(/^ATC:\s*'?/, "").replace(/'$/, ""));
    u.lang = "en-US"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

  const start = () => {
    if (!recRef.current) return;
    setTranscript(""); setResult(null); setListening(true);
    try { recRef.current.start(); } catch {}
  };
  const stop = () => { try { recRef.current?.stop(); } catch {}; setListening(false); };
  const next = () => { setIdx((i) => (i + 1) % SCENARIOS.length); setTranscript(""); setResult(null); };

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-3xl px-6 pt-12 md:pt-16">
        <div className="mb-6">
          <div className="text-sm text-muted-foreground">Sprint I4 · Voice AI</div>
          <h1 className="font-display text-3xl font-semibold md:text-5xl">Radio Lab</h1>
          <p className="mt-2 text-sm text-muted-foreground">Practice ATC-style readbacks aloud. Voice recognition scores your response in real time.</p>
        </div>

        {!supported && (
          <Card className="p-4 mb-4 border-warning/40">
            <p className="text-sm">Your browser does not support voice recognition. Use Chrome, Edge, or Safari for the best experience.</p>
          </Card>
        )}

        <Card className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <Badge variant="outline">Scenario {idx + 1} / {SCENARIOS.length}</Badge>
            <Button variant="ghost" size="sm" onClick={speakPrompt}><Volume2 className="h-4 w-4 mr-1.5" /> Play ATC</Button>
          </div>
          <p className="font-display text-xl leading-snug">{sc.prompt}</p>
          <p className="mt-2 text-xs text-muted-foreground">Hint: {sc.hint}</p>

          <div className="mt-6 flex items-center gap-3">
            {!listening ? (
              <Button onClick={start} disabled={!supported} size="lg">
                <Mic className="h-4 w-4 mr-2" /> Start speaking
              </Button>
            ) : (
              <Button onClick={stop} variant="destructive" size="lg">
                <MicOff className="h-4 w-4 mr-2" /> Stop
              </Button>
            )}
            <Button onClick={next} variant="outline"><RotateCcw className="h-4 w-4 mr-2" /> Next scenario</Button>
          </div>

          {transcript && (
            <div className="mt-6 space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">You said</div>
                <div className="mt-1 rounded-lg bg-muted/40 p-3 text-sm italic">"{transcript}"</div>
              </div>
              {result && (
                <div className={`flex items-center gap-2 rounded-lg p-3 ${result.passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {result.passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  <div className="text-sm">
                    <div className="font-semibold">{result.passed ? "Good readback" : "Try again"} · match {result.score}%</div>
                    {!result.passed && <div className="text-xs opacity-90 mt-0.5">Expected key phrases: {sc.expected}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </section>
    </StudentAppShell>
  );
}
