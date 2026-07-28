import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/airspace-3d")({
  head: () => ({
    meta: [
      { title: "3D Airspace Explorer · 107toFly" },
      { name: "description", content: "Explore Class B, C, D, and E airspace in 3D. Rotate, zoom, and see altitude tiers around a virtual airport." },
      { property: "og:title", content: "3D Airspace Explorer · 107toFly" },
      { property: "og:description", content: "Interactive 3D airspace visualization." },
    ],
  }),
  component: AirspacePage,
});

const AirspaceScene = lazy(() => import("@/components/AirspaceScene"));

const CLASSES = [
  { id: "B", name: "Class B", color: "#3b82f6", desc: "Major airports · surface to 10,000 ft MSL · upside-down wedding cake." },
  { id: "C", name: "Class C", color: "#a855f7", desc: "Busy towered airports · surface to 4,000 ft AGL · two tiers." },
  { id: "D", name: "Class D", color: "#ef4444", desc: "Towered airports · surface to 2,500 ft AGL · single cylinder." },
  { id: "E", name: "Class E", color: "#22c55e", desc: "Controlled airspace elsewhere · often starts at 700 or 1,200 AGL." },
];

function AirspacePage() {
  const [selected, setSelected] = useState<string>("B");

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-6xl px-6 pt-12 md:pt-16">
        <div className="mb-6">
          <div className="text-sm text-muted-foreground">Sprint I5 · Visual</div>
          <h1 className="font-display text-3xl font-semibold md:text-5xl">3D Airspace Explorer</h1>
          <p className="mt-2 text-sm text-muted-foreground">Drag to rotate. Scroll to zoom. Pick a class to highlight it.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
          <Card className="p-2 overflow-hidden">
            <div className="h-[520px] w-full rounded-lg bg-gradient-to-b from-slate-950 to-slate-900">
              <ClientOnly fallback={<div className="grid h-full place-items-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
                <Suspense fallback={<div className="grid h-full place-items-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
                  <AirspaceScene highlight={selected} />
                </Suspense>
              </ClientOnly>
            </div>
          </Card>

          <div className="space-y-3">
            {CLASSES.map((c) => (
              <Card key={c.id} className={`p-4 cursor-pointer transition-all ${selected === c.id ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"}`} onClick={() => setSelected(c.id)}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                  <Badge variant="outline" className="ml-auto text-[10px]">{c.id}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
                <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelected(c.id); }}>
                  Highlight
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </StudentAppShell>
  );
}
