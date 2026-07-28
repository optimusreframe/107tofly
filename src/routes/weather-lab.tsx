import { createFileRoute } from "@tanstack/react-router";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useMemo, useState } from "react";
import { CloudSun, Wind, Eye, Gauge, Thermometer } from "lucide-react";
import { LabChallenge, type LabItem } from "@/components/LabChallenge";

const WEATHER_CHALLENGE: LabItem[] = [
  {
    id: "w1",
    prompt: "METAR: '27015G25KT'. ¿Qué significa?",
    options: ["Viento 270° a 15 KT con ráfagas a 25 KT", "Visibilidad 27 SM, 15 nubes", "Temperatura 27°C", "Altímetro 27.15"],
    correctIndex: 0,
    explanation: "Formato dddffGggKT: dirección 270°, velocidad 15 KT, ráfagas 25 KT.",
  },
  {
    id: "w2",
    prompt: "Visibilidad reportada '2SM'. Bajo Part 107 diurno, ¿puedes volar?",
    options: ["Sí", "No, mínimo 3 SM", "Solo con observador visual", "Solo bajo waiver"],
    correctIndex: 1,
    explanation: "Part 107 exige mínimo 3 SM de visibilidad desde la estación de control.",
  },
  {
    id: "w3",
    prompt: "'OVC008' — techo cubierto a 800 ft AGL. ¿Puedes operar a 400 ft AGL?",
    options: ["Sí, cumples separación", "No, faltan 500 ft debajo de nubes", "Sí, si hay observador", "Solo VLOS extendido"],
    correctIndex: 1,
    explanation: "Separación mínima: 500 ft debajo. 800 − 400 = 400 ft, insuficiente.",
  },
  {
    id: "w4",
    prompt: "'BR' en METAR indica…",
    options: ["Brisa fuerte", "Neblina (mist)", "Tormenta ligera", "Ráfaga"],
    correctIndex: 1,
    explanation: "BR = mist/neblina; visibilidad reducida entre 5/8 y 6 SM.",
  },
  {
    id: "w5",
    prompt: "Temp/Dewpoint '18/17'. ¿Qué riesgo hay?",
    options: ["Ninguno", "Formación de niebla / techos bajos", "Turbulencia térmica", "Congelamiento"],
    correctIndex: 1,
    explanation: "Spread ≤ 3°C indica alta humedad relativa y potencial niebla.",
  },
];

export const Route = createFileRoute("/weather-lab")({
  head: () => ({
    meta: [
      { title: "Weather Lab · METAR decoder — 107toFly" },
      { name: "description", content: "Decodifica METAR visualmente y entrena tu lectura del clima aeronáutico." },
    ],
  }),
  component: WeatherLab,
});

const samples = [
  "KDCA 121651Z 27015G25KT 10SM FEW040 24/12 A3001",
  "KJFK 121751Z 18008KT 6SM BR SCT008 OVC020 18/17 A2998",
  "KLAX 121753Z VRB03KT 2SM HZ FEW015 22/16 A3005",
];

type Decoded = {
  station: string;
  time: string;
  wind: string;
  visibility: string;
  weather?: string;
  clouds: string[];
  temp: string;
  dew: string;
  altimeter: string;
};

function decode(metar: string): Decoded {
  const parts = metar.trim().split(/\s+/);
  const d: Decoded = {
    station: parts[0],
    time: "",
    wind: "",
    visibility: "",
    clouds: [],
    temp: "",
    dew: "",
    altimeter: "",
  };
  for (const p of parts.slice(1)) {
    if (/^\d{6}Z$/.test(p)) d.time = `Día ${p.slice(0, 2)} · ${p.slice(2, 4)}:${p.slice(4, 6)} UTC`;
    else if (/KT$/.test(p)) {
      if (p.startsWith("VRB")) d.wind = `Variable a ${p.match(/\d+/)?.[0]} KT`;
      else {
        const m = p.match(/^(\d{3})(\d{2,3})(?:G(\d{2,3}))?KT$/);
        if (m) d.wind = `${m[1]}° a ${m[2]} KT${m[3] ? ` con ráfagas a ${m[3]} KT` : ""}`;
      }
    } else if (/^\d+SM$/.test(p)) d.visibility = `${p.replace("SM", "")} statute miles`;
    else if (/^(BR|HZ|FG|RA|SN|TS|DZ|FU)$/.test(p)) {
      const map: Record<string, string> = { BR: "neblina", HZ: "calima", FG: "niebla", RA: "lluvia", SN: "nieve", TS: "tormenta", DZ: "llovizna", FU: "humo" };
      d.weather = map[p];
    } else if (/^(FEW|SCT|BKN|OVC)\d{3}/.test(p)) {
      const cov = { FEW: "Pocas nubes", SCT: "Dispersas", BKN: "Fragmentadas", OVC: "Cubierto" } as Record<string, string>;
      const c = p.slice(0, 3);
      const h = parseInt(p.slice(3, 6)) * 100;
      d.clouds.push(`${cov[c]} a ${h.toLocaleString()} ft AGL`);
    } else if (/^\d{2}\/M?\d{2}$/.test(p)) {
      const [t, dw] = p.split("/");
      d.temp = `${t}°C`;
      d.dew = `${dw.replace("M", "-")}°C`;
    } else if (/^A\d{4}$/.test(p)) {
      d.altimeter = `${p.slice(1, 3)}.${p.slice(3)} inHg`;
    }
  }
  return d;
}

function WeatherLab() {
  const [metar, setMetar] = useState(samples[0]);
  const decoded = useMemo(() => decode(metar), [metar]);

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-4xl px-6 pt-12 md:pt-16">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">Weather Lab</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Decodifica <span className="text-gradient">METAR</span> al vuelo.
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Pega un METAR real o usa una muestra. Vemos qué dice cada grupo.
        </p>

        <div className="mt-8 glass-strong rounded-3xl p-5 shadow-glass">
          <textarea
            value={metar}
            onChange={(e) => setMetar(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-2xl border border-border bg-background/60 p-4 font-mono text-sm outline-none focus:border-primary"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {samples.map((s, i) => (
              <button
                key={i}
                onClick={() => setMetar(s)}
                className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs hover:bg-accent"
              >
                Muestra {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            { icon: CloudSun, l: "Estación / hora", v: `${decoded.station} · ${decoded.time}` },
            { icon: Wind, l: "Viento", v: decoded.wind || "—" },
            { icon: Eye, l: "Visibilidad", v: `${decoded.visibility}${decoded.weather ? ` · ${decoded.weather}` : ""}` },
            { icon: Gauge, l: "Altímetro", v: decoded.altimeter || "—" },
            { icon: Thermometer, l: "Temp / Dewpoint", v: `${decoded.temp} / ${decoded.dew}` },
            { icon: CloudSun, l: "Nubes", v: decoded.clouds.join(" · ") || "Cielo despejado" },
          ].map((row) => (
            <div key={row.l} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <row.icon className="h-3.5 w-3.5" /> {row.l}
              </div>
              <div className="mt-1 font-display text-base">{row.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 glass rounded-3xl p-5 text-sm">
          <div className="font-medium">Decisión Go / No-Go</div>
          <p className="mt-1 text-muted-foreground">
            Bajo Part 107 necesitas mín. 3 SM de visibilidad y separación de nubes
            (500 ft debajo, 2,000 ft horizontal). Compara contra el METAR decodificado.
          </p>
        </div>
      </section>
    </StudentAppShell>
  );
}
