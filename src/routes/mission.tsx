import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Plane } from "lucide-react";

export const Route = createFileRoute("/mission")({
  head: () => ({
    meta: [
      { title: "Mission Planner — 107toFly" },
      { name: "description", content: "Planea una misión sUAS y obtén score de seguridad y decisión Go/No-Go." },
    ],
  }),
  component: Mission,
});

function Mission() {
  const [airspace, setAirspace] = useState<"G"|"E"|"D"|"C"|"B">("G");
  const [authorized, setAuthorized] = useState(false);
  const [vis, setVis] = useState(5); // SM
  const [wind, setWind] = useState(10); // KT
  const [people, setPeople] = useState<"none"|"sparse"|"crowd">("none");
  const [vlos, setVlos] = useState(true);
  const [night, setNight] = useState(false);
  const [antiCol, setAntiCol] = useState(true);
  const [battery, setBattery] = useState(80);
  const [preflight, setPreflight] = useState(true);

  const result = useMemo(() => {
    const issues: { kind: "stop"|"warn"; msg: string }[] = [];
    if (airspace !== "G" && !authorized) issues.push({ kind: "stop", msg: `Necesitas autorización ATC para Class ${airspace} (107.41).` });
    if (vis < 3) issues.push({ kind: "stop", msg: "Visibilidad < 3 SM viola 107.51." });
    if (people === "crowd") issues.push({ kind: "stop", msg: "Vuelo sobre multitudes requiere Cat 4 + waiver (107.39)." });
    if (!vlos) issues.push({ kind: "stop", msg: "Sin VLOS necesitas waiver 107.31." });
    if (night && !antiCol) issues.push({ kind: "stop", msg: "Operación nocturna sin anti-collision lights (107.29)." });
    if (battery < 30) issues.push({ kind: "stop", msg: "Batería < 30% — sin reserva segura." });
    if (!preflight) issues.push({ kind: "stop", msg: "Falta preflight inspection (107.49)." });

    if (wind > 20) issues.push({ kind: "warn", msg: "Viento alto — confirma performance del UAS." });
    if (people === "sparse") issues.push({ kind: "warn", msg: "Personas dispersas — confirma Cat 1/2/3 compliance." });
    if (battery < 50) issues.push({ kind: "warn", msg: "Batería baja — planifica retorno temprano." });

    const stops = issues.filter(i => i.kind === "stop").length;
    const warns = issues.filter(i => i.kind === "warn").length;
    let score = 100 - stops * 35 - warns * 10;
    score = Math.max(0, Math.min(100, score));
    const status = stops > 0 ? "no-go" : warns > 0 ? "caution" : "go";
    return { issues, score, status: status as "go"|"caution"|"no-go" };
  }, [airspace, authorized, vis, wind, people, vlos, night, antiCol, battery, preflight]);

  const statusUi = {
    go: { c: "text-success", bg: "bg-success/10", icon: CheckCircle2, label: "GO · Seguro para volar" },
    caution: { c: "text-warning-foreground", bg: "bg-warning/15", icon: AlertTriangle, label: "PROCEED WITH CAUTION" },
    "no-go": { c: "text-destructive", bg: "bg-destructive/10", icon: XCircle, label: "NO-GO · No vueles" },
  }[result.status];
  const Icon = statusUi.icon;

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-6 pt-12 md:pt-16">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">Mission Planner</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Planea. <span className="text-gradient">Decide.</span> Vuela seguro.
        </h1>

        <div className="mt-8 grid gap-5 lg:grid-cols-5">
          {/* Form */}
          <div className="glass-strong rounded-3xl p-6 shadow-glass lg:col-span-3 space-y-5">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Espacio aéreo</label>
              <div className="mt-2 flex gap-1.5">
                {(["G","E","D","C","B"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAirspace(a)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-mono transition ${airspace === a ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/60 hover:bg-accent"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              {airspace !== "G" && (
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
                  Tengo autorización ATC / LAANC
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Slider label="Visibilidad" value={vis} setValue={setVis} min={0} max={10} unit=" SM" />
              <Slider label="Viento" value={wind} setValue={setWind} min={0} max={35} unit=" KT" />
              <Slider label="Batería" value={battery} setValue={setBattery} min={0} max={100} unit="%" />
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Personas en el área</label>
                <div className="mt-2 flex gap-1.5">
                  {([
                    { v: "none", l: "Ninguna" },
                    { v: "sparse", l: "Dispersas" },
                    { v: "crowd", l: "Multitud" },
                  ] as const).map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setPeople(o.v)}
                      className={`flex-1 rounded-xl border px-2 py-2 text-xs transition ${people === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/60 hover:bg-accent"}`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Toggle label="VLOS" v={vlos} set={setVlos} />
              <Toggle label="Nocturno" v={night} set={setNight} />
              <Toggle label="Anti-collision" v={antiCol} set={setAntiCol} />
              <Toggle label="Preflight ✓" v={preflight} set={setPreflight} />
            </div>
          </div>

          {/* Result */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-strong rounded-3xl p-6 shadow-elevated">
              <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${statusUi.bg} ${statusUi.c}`}>
                <Icon className="h-5 w-5" /> {statusUi.label}
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Safety score</div>
                  <div className="font-display text-5xl font-semibold">{result.score}</div>
                </div>
                <Plane className="h-10 w-10 text-primary animate-float-slow" />
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${result.score}%`,
                    background: result.status === "go" ? "var(--success)" : result.status === "caution" ? "var(--warning)" : "var(--destructive)",
                  }}
                />
              </div>
            </div>

            <div className="glass rounded-3xl p-5">
              <div className="font-display text-base font-semibold">Hallazgos</div>
              {result.issues.length === 0 ? (
                <p className="mt-2 text-sm text-success">Todo OK. Cielos despejados — vuela seguro.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {result.issues.map((i, k) => (
                    <li key={k} className="flex gap-2">
                      {i.kind === "stop" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}
                      <span className="text-muted-foreground">{i.msg}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Slider({ label, value, setValue, min, max, unit }: { label: string; value: number; setValue: (n: number) => void; min: number; max: number; unit: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
        <span className="font-mono text-sm">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--color-primary)]"
      />
    </div>
  );
}

function Toggle({ label, v, set }: { label: string; v: boolean; set: (b: boolean) => void }) {
  return (
    <button
      onClick={() => set(!v)}
      className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition ${v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/60 hover:bg-accent"}`}
    >
      {label}
    </button>
  );
}
