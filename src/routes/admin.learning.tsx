import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2, ChevronRight, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { AdminAppShell } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listAdminUnits, upsertAdminUnit, deleteAdminUnit,
  listAdminConcepts, upsertAdminConcept, deleteAdminConcept,
  listAdminExercises, upsertAdminExercise, deleteAdminExercise,
} from "@/lib/admin-learning.functions";
import { translateUnitToSpanish } from "@/lib/admin-unit-translations.functions";
import { Languages } from "lucide-react";
import { ExerciseFormEditor } from "@/components/admin/ExerciseFormEditor";

export const Route = createFileRoute("/admin/learning")({
  head: () => ({ meta: [{ title: "Learning Units — Admin · 107toFly" }, { name: "robots", content: "noindex" }] }),
  component: AdminLearningPage,
});

type Unit = { id: string; slug: string; locale: string; title: string; summary: string | null; order_index: number; status: string; translation_group_id: string | null; lesson_id: string | null; updated_at?: string };
type Concept = { id: string; unit_id: string; title: string; body_md: string | null; order_index: number; locale: string; updated_at?: string };
type Exercise = { id: string; concept_id: string; kind: string; payload: unknown; answer: unknown; explanation: string | null; difficulty: number; locale: string; updated_at?: string };

const STATUSES = ["draft","review","published","archived"] as const;
const LOCALES = ["en","es"] as const;
const KINDS = ["mcq","cloze","order","match"] as const;

function AdminLearningPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const listUnits = useServerFn(listAdminUnits);
  const saveUnit = useServerFn(upsertAdminUnit);
  const delUnit = useServerFn(deleteAdminUnit);
  const listConcepts = useServerFn(listAdminConcepts);
  const saveConcept = useServerFn(upsertAdminConcept);
  const delConcept = useServerFn(deleteAdminConcept);
  const listExercises = useServerFn(listAdminExercises);
  const saveExercise = useServerFn(upsertAdminExercise);
  const delExercise = useServerFn(deleteAdminExercise);
  const translateUnitFn = useServerFn(translateUnitToSpanish);
  const [translating, setTranslating] = useState<string | null>(null);

  const [units, setUnits] = useState<Unit[] | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [concepts, setConcepts] = useState<Concept[] | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  const refreshUnits = () => listUnits().then((r) => setUnits(r.units as Unit[])).catch((e) => toast.error(e?.message ?? "Error"));
  useEffect(() => { if (isAdmin) refreshUnits(); }, [isAdmin]); // eslint-disable-line

  useEffect(() => {
    if (!selectedUnit) { setConcepts(null); setSelectedConcept(null); return; }
    listConcepts({ data: { unit_id: selectedUnit.id } })
      .then((r) => setConcepts(r.concepts as Concept[]))
      .catch((e) => toast.error(e?.message ?? "Error"));
  }, [selectedUnit, listConcepts]);

  useEffect(() => {
    if (!selectedConcept) { setExercises(null); return; }
    listExercises({ data: { concept_id: selectedConcept.id } })
      .then((r) => setExercises(r.exercises as Exercise[]))
      .catch((e) => toast.error(e?.message ?? "Error"));
  }, [selectedConcept, listExercises]);

  if (authLoading || rolesLoading) return <AdminAppShell><div className="p-8 text-sm text-muted-foreground">Loading…</div></AdminAppShell>;
  if (!isAdmin) return <AdminAppShell><div className="p-8 text-center"><Shield className="mx-auto h-8 w-8" /><p className="mt-4">Access denied</p></div></AdminAppShell>;

  const createUnit = async () => {
    setBusy(true);
    try {
      const nextOrder = (units?.[units.length - 1]?.order_index ?? -1) + 1;
      await saveUnit({ data: { slug: `unit-${Date.now()}`, locale: "en", title: "New unit", summary: "", order_index: nextOrder, status: "draft" } });
      await refreshUnits();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const updateUnit = async (u: Unit, patch: Partial<Unit>) => {
    const next = { ...u, ...patch };
    setUnits((cur) => cur?.map((x) => x.id === u.id ? next : x) ?? cur);
    if (selectedUnit?.id === u.id) setSelectedUnit(next);
    try {
      await saveUnit({ data: {
        id: u.id, slug: next.slug, locale: next.locale as "en"|"es", title: next.title,
        summary: next.summary ?? "", order_index: next.order_index, status: next.status as never,
        translation_group_id: next.translation_group_id ?? undefined,
      }});
    } catch (e) { toast.error((e as Error).message); refreshUnits(); }
  };

  const removeUnit = async (u: Unit) => {
    if (!confirm(`Delete unit "${u.title}"? This deletes its concepts and exercises.`)) return;
    await delUnit({ data: { id: u.id } });
    if (selectedUnit?.id === u.id) setSelectedUnit(null);
    refreshUnits();
  };

  const createConcept = async () => {
    if (!selectedUnit) return;
    const nextOrder = (concepts?.[concepts.length - 1]?.order_index ?? -1) + 1;
    await saveConcept({ data: { unit_id: selectedUnit.id, title: "New concept", body_md: "", order_index: nextOrder, locale: selectedUnit.locale as "en"|"es" } });
    listConcepts({ data: { unit_id: selectedUnit.id } }).then((r) => setConcepts(r.concepts as Concept[]));
  };

  const updateConcept = async (c: Concept, patch: Partial<Concept>) => {
    const next = { ...c, ...patch };
    setConcepts((cur) => cur?.map((x) => x.id === c.id ? next : x) ?? cur);
    if (selectedConcept?.id === c.id) setSelectedConcept(next);
    try {
      await saveConcept({ data: { id: c.id, unit_id: c.unit_id, title: next.title, body_md: next.body_md ?? "", order_index: next.order_index, locale: next.locale as "en"|"es" } });
    } catch (e) { toast.error((e as Error).message); }
  };

  const removeConcept = async (c: Concept) => {
    if (!confirm(`Delete concept "${c.title}"?`)) return;
    await delConcept({ data: { id: c.id } });
    if (selectedConcept?.id === c.id) setSelectedConcept(null);
    if (selectedUnit) listConcepts({ data: { unit_id: selectedUnit.id } }).then((r) => setConcepts(r.concepts as Concept[]));
  };

  return (
    <AdminAppShell>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Learning Units</h1>
            <p className="text-sm text-muted-foreground">Authoring for concepts and exercises (Session Player engine).</p>
          </div>
          <Button onClick={createUnit} disabled={busy}><Plus className="mr-1 h-4 w-4" /> New unit</Button>
        </header>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Units list */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-2">
            {!units ? <div className="p-4 text-sm text-muted-foreground">Loading…</div> :
              units.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No units yet.</div> :
              <ul className="space-y-1">
                {units.map((u) => (
                  <li key={u.id}>
                    <button
                      onClick={() => setSelectedUnit(u)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-accent/60 ${selectedUnit?.id === u.id ? "bg-accent" : ""}`}
                    >
                      <span className="truncate">
                        <span className="font-medium">{u.title}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{u.slug}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{u.locale}</Badge>
                        <Badge variant={u.status === "published" ? "default" : "secondary"} className="text-[10px]">{u.status}</Badge>
                        <ChevronRight className="h-3 w-3 opacity-50" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            }
          </div>

          {/* Editor */}
          <div className="space-y-4">
            {!selectedUnit ? (
              <div className="rounded-2xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">Select a unit to edit its concepts and exercises.</div>
            ) : (
              <>
                <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-medium">Unit metadata</h2>
                    <div className="flex items-center gap-1">
                      {selectedUnit.locale === "en" && (
                        <Button variant="outline" size="sm" disabled={translating === selectedUnit.id}
                          onClick={async () => {
                            setTranslating(selectedUnit.id);
                            try {
                              const r = await translateUnitFn({ data: { unitId: selectedUnit.id } });
                              toast.success(`Spanish draft ready · ${r.conceptCount} concepts · ${r.exerciseCount} exercises`);
                              await refreshUnits();
                              // auto-select the ES unit if present
                              const fresh = await listUnits();
                              const esUnit = (fresh.units as Unit[]).find((x) => x.id === r.esUnitId);
                              if (esUnit) { setUnits(fresh.units as Unit[]); setSelectedUnit(esUnit); }
                            } catch (e) { toast.error((e as Error).message); }
                            finally { setTranslating(null); }
                          }}>
                          {translating === selectedUnit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Languages className="mr-1 h-4 w-4" /> Translate to ES</>}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => removeUnit(selectedUnit)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs text-muted-foreground">Title
                      <Input value={selectedUnit.title} onChange={(e) => updateUnit(selectedUnit, { title: e.target.value })} />
                    </label>
                    <label className="text-xs text-muted-foreground">Slug
                      <Input value={selectedUnit.slug} onChange={(e) => updateUnit(selectedUnit, { slug: e.target.value })} />
                    </label>
                    <label className="text-xs text-muted-foreground">Locale
                      <Select value={selectedUnit.locale} onValueChange={(v) => updateUnit(selectedUnit, { locale: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{LOCALES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                    <label className="text-xs text-muted-foreground">Status
                      <Select value={selectedUnit.status} onValueChange={(v) => updateUnit(selectedUnit, { status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                    <label className="text-xs text-muted-foreground">Order
                      <Input type="number" value={selectedUnit.order_index} onChange={(e) => updateUnit(selectedUnit, { order_index: Number(e.target.value) || 0 })} />
                    </label>
                    <label className="text-xs text-muted-foreground sm:col-span-2">Summary
                      <Textarea value={selectedUnit.summary ?? ""} onChange={(e) => updateUnit(selectedUnit, { summary: e.target.value })} rows={2} />
                    </label>
                  </div>
                </div>

                {/* Concepts */}
                <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-medium">Concepts</h2>
                    <Button size="sm" onClick={createConcept}><Plus className="mr-1 h-4 w-4" /> Add concept</Button>
                  </div>
                  {!concepts ? <div className="text-sm text-muted-foreground">Loading…</div> :
                    concepts.length === 0 ? <div className="text-sm text-muted-foreground">No concepts yet.</div> :
                    <ul className="space-y-2">
                      {concepts.map((c) => (
                        <li key={c.id} className={`rounded-xl border p-3 ${selectedConcept?.id === c.id ? "border-primary" : "border-border/60"}`}>
                          <div className="flex items-start gap-2">
                            <Input className="flex-1" value={c.title} onChange={(e) => updateConcept(c, { title: e.target.value })} />
                            <Input type="number" className="w-20" value={c.order_index} onChange={(e) => updateConcept(c, { order_index: Number(e.target.value) || 0 })} />
                            <Button variant="ghost" size="sm" onClick={() => setSelectedConcept(selectedConcept?.id === c.id ? null : c)}>{selectedConcept?.id === c.id ? "Close" : "Open"}</Button>
                            <Button variant="ghost" size="sm" onClick={() => removeConcept(c)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                          {selectedConcept?.id === c.id && (
                            <div className="mt-3 space-y-3">
                              <Textarea placeholder="Body (markdown)" rows={4} value={c.body_md ?? ""} onChange={(e) => updateConcept(c, { body_md: e.target.value })} />
                              <ExerciseEditor
                                conceptId={c.id}
                                locale={c.locale}
                                exercises={exercises}
                                onCreate={async () => {
                                  await saveExercise({ data: {
                                    concept_id: c.id, kind: "mcq",
                                    payload: { question: "New question", options: ["A","B","C","D"] },
                                    answer: { index: 0 },
                                    explanation: "", difficulty: 1, locale: c.locale as "en"|"es",
                                  }});
                                  const r = await listExercises({ data: { concept_id: c.id } });
                                  setExercises(r.exercises as Exercise[]);
                                }}
                                onSave={async (ex) => {
                                  await saveExercise({ data: {
                                    id: ex.id, concept_id: ex.concept_id, kind: ex.kind as never,
                                    payload: ex.payload as never, answer: ex.answer as never,
                                    explanation: ex.explanation ?? "", difficulty: ex.difficulty, locale: ex.locale as "en"|"es",
                                  }});
                                  const r = await listExercises({ data: { concept_id: c.id } });
                                  setExercises(r.exercises as Exercise[]);
                                }}
                                onDelete={async (ex) => {
                                  if (!confirm("Delete exercise?")) return;
                                  await delExercise({ data: { id: ex.id } });
                                  const r = await listExercises({ data: { concept_id: c.id } });
                                  setExercises(r.exercises as Exercise[]);
                                }}
                              />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  }
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminAppShell>
  );
}

function ExerciseEditor({
  conceptId, locale, exercises, onCreate, onSave, onDelete,
}: {
  conceptId: string; locale: string; exercises: Exercise[] | null;
  onCreate: () => Promise<void>;
  onSave: (ex: Exercise) => Promise<void>;
  onDelete: (ex: Exercise) => Promise<void>;
}) {
  const list = useMemo(() => (exercises ?? []).filter((e) => e.concept_id === conceptId), [exercises, conceptId]);
  void locale;

  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Exercises</h3>
        <Button size="sm" variant="secondary" onClick={onCreate}><Plus className="mr-1 h-3 w-3" /> Add</Button>
      </div>
      {list.length === 0 ? <div className="text-xs text-muted-foreground">No exercises.</div> :
        <ul className="space-y-3">
          {list.map((ex) => (
            <li key={ex.id} className="rounded-lg border border-border/50 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={ex.kind} onValueChange={(v) => onSave({ ...ex, kind: v })}>
                  <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
                <label className="text-xs text-muted-foreground">Difficulty
                  <Input type="number" min={1} max={5} className="ml-2 inline-block w-16" value={ex.difficulty}
                    onChange={(e) => onSave({ ...ex, difficulty: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} />
                </label>
                <Badge variant="outline" className="text-[10px]">{ex.locale}</Badge>
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onDelete(ex)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <ExerciseFormEditor ex={ex} onChange={(patch) => onSave({ ...ex, ...patch })} />
              <label className="block text-xs text-muted-foreground">Explanation
                <Textarea rows={2} value={ex.explanation ?? ""} onChange={(e) => onSave({ ...ex, explanation: e.target.value })} />
              </label>
            </li>
          ))}
        </ul>
      }
    </div>
  );
}
