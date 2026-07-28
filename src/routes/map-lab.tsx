import { createFileRoute } from "@tanstack/react-router";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useState } from "react";
import { Sparkles, MapPin } from "lucide-react";
import { LabChallenge, type LabItem } from "@/components/LabChallenge";

const MAP_CHALLENGE: LabItem[] = [
  {
    id: "q1",
    prompt: "Vuelas a 350 ft AGL bajo la shelf de Class B (piso 3,000 ft MSL). ¿Necesitas autorización LAANC?",
    options: ["Sí, siempre bajo Class B", "No, estás por debajo del piso", "Solo si vuelas de noche", "Solo con visibilidad menor a 3 SM"],
    correctIndex: 1,
    explanation: "El piso de la shelf está a 3,000 ft MSL. A 400 ft AGL estás en Class G/E bajo la shelf.",
  },
  {
    id: "q2",
    prompt: "El anillo interno de Class B llega hasta la superficie (SFC). ¿Qué necesitas para operar ahí?",
    options: ["Nada, es espacio libre", "Autorización ATC vía LAANC o waiver", "Solo notificar al aeropuerto", "Certificado médico Clase 2"],
    correctIndex: 1,
    explanation: "Cualquier operación en Class B requiere autorización ATC previa; LAANC agiliza el proceso.",
  },
  {
    id: "q3",
    prompt: "Clase G no controlada: ¿qué reglas Part 107 aplican?",
    options: ["Ninguna", "Máx 400 ft AGL y VLOS", "Solo VLOS", "Solo altitud máxima"],
    correctIndex: 1,
    explanation: "Part 107 exige 400 ft AGL máx y VLOS incluso en Class G.",
  },
  {
    id: "q4",
    prompt: "Vuelas en Class C surface area. ¿Es suficiente notificar por radio?",
    options: ["Sí, radio basta", "No, requiere autorización ATC", "Solo si es diurno", "Solo si el dron pesa <250g"],
    correctIndex: 1,
    explanation: "Class C exige autorización ATC como Class B. La radio no es autorización.",
  },
  {
    id: "q5",
    prompt: "Class E con piso a 700 ft AGL. Operando a 400 ft AGL, ¿en qué clase estás?",
    options: ["Class E", "Class G debajo del piso", "Class B", "Class D"],
    correctIndex: 1,
    explanation: "Debajo del piso de Class E, el espacio es Class G — sin autorización ATC bajo Part 107.",
  },
];

export const Route = createFileRoute("/map-lab")({
  head: () => ({
    meta: [
      { title: "Map Lab · Sectional charts — 107toFly" },
      { name: "description", content: "Identifica clases de espacio aéreo, símbolos y autorizaciones sobre una sectional simulada." },
    ],
  }),
  component: MapLab,
});

type Spot = {
  id: string;
  cx: number; // %
  cy: number; // %
  airspace: "B" | "C" | "D" | "E" | "G";
  ceiling: string;
  floor: string;
  needsAuth: boolean;
  note: string;
};

const spots: Spot[] = [
  { id: "s1", cx: 28, cy: 38, airspace: "B", ceiling: "100", floor: "SFC", needsAuth: true, note: "Class B core — requiere autorización ATC (LAANC)." },
  { id: "s2", cx: 58, cy: 30, airspace: "B", ceiling: "100", floor: "30", needsAuth: false, note: "Class B shelf con piso a 3,000 ft MSL. Puedes volar bajo a 400 ft AGL sin autorización." },
  { id: "s3", cx: 72, cy: 62, airspace: "C", ceiling: "40", floor: "SFC", needsAuth: true, note: "Class C surface — requiere autorización ATC." },
  { id: "s4", cx: 22, cy: 70, airspace: "G", ceiling: "—", floor: "SFC", needsAuth: false, note: "Class G uncontrolled. No requiere autorización pero mantén VLOS y 400 ft AGL." },
  { id: "s5", cx: 45, cy: 78, airspace: "E", ceiling: "180", floor: "700AGL", needsAuth: false, note: "Class E con piso a 700 ft AGL. Bajo Part 107 (≤400 ft) operas en G debajo, sin autorización." },
];

const colorFor = (a: Spot["airspace"]) =>
  a === "B" ? "oklch(0.6 0.22 25)" : a === "C" ? "oklch(0.65 0.18 280)" : a === "D" ? "oklch(0.65 0.18 240)" : a === "E" ? "oklch(0.7 0.14 200)" : "oklch(0.7 0.12 145)";

function MapLab() {
  const [selected, setSelected] = useState<Spot>(spots[0]);

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-6xl px-6 pt-12 md:pt-16">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">Map Lab</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Toca, identifica, <span className="text-gradient">decide.</span>
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Una sectional simulada con hotspots reales. Lee techo / piso, identifica la clase
          y decide si necesitas autorización.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {/* Map */}
          <div className="glass-strong relative overflow-hidden rounded-3xl shadow-glass lg:col-span-2 aspect-[4/3]">
            {/* Faux sectional background */}
            <svg viewBox="0 0 100 75" className="absolute inset-0 h-full w-full">
              <defs>
                <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                  <path d="M 5 0 L 0 0 0 5" fill="none" stroke="oklch(0.7 0.05 240 / 0.15)" strokeWidth="0.2" />
                </pattern>
                <radialGradient id="terrain" cx="50%" cy="40%" r="80%">
                  <stop offset="0%" stopColor="oklch(0.92 0.05 80)" />
                  <stop offset="60%" stopColor="oklch(0.88 0.06 70)" />
                  <stop offset="100%" stopColor="oklch(0.78 0.08 60)" />
                </radialGradient>
              </defs>
              <rect width="100" height="75" fill="url(#terrain)" />
              <rect width="100" height="75" fill="url(#grid)" />
              {/* Class B rings */}
              <circle cx="35" cy="35" r="22" fill="oklch(0.6 0.22 25 / 0.08)" stroke="oklch(0.6 0.22 25)" strokeWidth="0.4" />
              <circle cx="35" cy="35" r="14" fill="oklch(0.6 0.22 25 / 0.12)" stroke="oklch(0.6 0.22 25)" strokeWidth="0.4" />
              <circle cx="35" cy="35" r="7" fill="oklch(0.6 0.22 25 / 0.18)" stroke="oklch(0.6 0.22 25)" strokeWidth="0.5" />
              {/* Class C */}
              <circle cx="72" cy="58" r="10" fill="oklch(0.65 0.18 280 / 0.12)" stroke="oklch(0.65 0.18 280)" strokeWidth="0.4" strokeDasharray="1 0.6" />
              {/* Class E magenta vignette */}
              <circle cx="48" cy="72" r="14" fill="none" stroke="oklch(0.7 0.18 320 / 0.5)" strokeWidth="2" />
              {/* Airport symbols */}
              <circle cx="35" cy="35" r="1.2" fill="oklch(0.4 0.2 250)" />
              <circle cx="72" cy="58" r="1" fill="oklch(0.4 0.2 250)" />
            </svg>

            {spots.map((s) => {
              const active = s.id === selected.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  style={{ left: `${s.cx}%`, top: `${s.cy}%`, background: colorFor(s.airspace) }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white shadow-lg ring-4 transition ${active ? "ring-white scale-110" : "ring-white/40"}`}
                >
                  {s.airspace}
                </button>
              );
            })}

            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-[10px] font-mono backdrop-blur">
              {(["B","C","D","E","G"] as const).map((a) => (
                <span key={a} className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(a) }} /> Class {a}
                </span>
              ))}
            </div>
          </div>

          {/* Inspector */}
          <div className="glass-strong rounded-3xl p-5 shadow-glass">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Hotspot seleccionado
            </div>
            <div className="mt-2 font-display text-2xl font-semibold">Class {selected.airspace}</div>
            <div className="mt-1 font-mono text-sm text-muted-foreground">
              {selected.ceiling} / {selected.floor}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl border border-border bg-card/60 p-3">
                <div className="text-muted-foreground">Techo</div>
                <div className="font-mono text-base">{selected.ceiling}</div>
              </div>
              <div className="rounded-2xl border border-border bg-card/60 p-3">
                <div className="text-muted-foreground">Piso</div>
                <div className="font-mono text-base">{selected.floor}</div>
              </div>
            </div>

            <div className={`mt-4 rounded-2xl p-3 text-sm ${selected.needsAuth ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
              {selected.needsAuth ? "Requiere autorización ATC" : "No requiere autorización"}
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-accent/40 p-3 text-sm">
              <div className="mb-1 flex items-center gap-1.5 font-medium">
                <Sparkles className="h-4 w-4 text-primary" /> FlyCoach
              </div>
              <p className="text-muted-foreground">{selected.note}</p>
            </div>
          </div>
        </div>
      </section>
    </StudentAppShell>
  );
}
