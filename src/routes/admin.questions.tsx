import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Search, Plus, Copy, Archive, RotateCcw, Save, Loader2, CheckCircle2 } from "lucide-react";
import { AdminAppShell } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { useDeviceMode } from "@/hooks/use-device-mode";
import {
  getAdminQuestions,
  createAdminQuestion,
  updateAdminQuestion,
  archiveAdminQuestion,
  duplicateAdminQuestion,
} from "@/server/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/questions")({
  head: () => ({ meta: [{ title: "Questions — Admin · 107toFly" }, { name: "robots", content: "noindex" }] }),
  component: AdminQuestionsPage,
});

type Q = {
  id: string; question: string; options: string[]; correct_index: number;
  explanation: string; common_mistake: string | null; topic: string;
  difficulty: string; acs_code: string; source: string; tags: string[] | null;
  status: string; locale: string; version?: number; updated_at?: string; updated_by?: string | null;
};

const TOPICS = ["regulations","airspace","sectional","weather","performance","operations","adm","emergencies","remote_id","maintenance"];
const DIFFS = ["easy","medium","hard"] as const;
const STATUSES = ["draft","reviewed","published","archived"] as const;
const LOCALES = ["en","es"] as const;

function AdminQuestionsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const { isMobile } = useDeviceMode();
  const fetchList = useServerFn(getAdminQuestions);
  const createFn = useServerFn(createAdminQuestion);
  const updateFn = useServerFn(updateAdminQuestion);
  const archiveFn = useServerFn(archiveAdminQuestion);
  const dupFn = useServerFn(duplicateAdminQuestion);

  const [items, setItems] = useState<Q[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");
  const [editing, setEditing] = useState<Q | null>(null);
  const [draft, setDraft] = useState<Partial<Q> | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  const refresh = () => {
    if (!isAdmin) return;
    fetchList().then((r) => setItems(r.questions as Q[])).catch((e) => toast.error(e?.message ?? "Error"));
  };
  useEffect(refresh, [isAdmin]); // eslint-disable-line

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (topicFilter !== "all" && it.topic !== topicFilter) return false;
      if (diffFilter !== "all" && it.difficulty !== diffFilter) return false;
      if (q && !`${it.question} ${it.source} ${it.acs_code} ${(it.tags ?? []).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, statusFilter, topicFilter, diffFilter]);

  const counts = useMemo(() => {
    const c = { total: items?.length ?? 0, published: 0, draft: 0, archived: 0 };
    for (const it of items ?? []) {
      if (it.status === "published") c.published++;
      else if (it.status === "archived") c.archived++;
      else c.draft++;
    }
    return c;
  }, [items]);

  const openEditor = (q: Q | null) => {
    setEditing(q);
    setPreviewIdx(null);
    setDraft(q ?? {
      question: "", options: ["","","",""], correct_index: 0,
      explanation: "", common_mistake: "", topic: "regulations", difficulty: "medium",
      acs_code: "", source: "", tags: [], status: "draft", locale: "en",
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = {
        question: draft.question ?? "",
        options: (draft.options ?? ["","","",""]) as string[],
        correct_index: Number(draft.correct_index ?? 0),
        explanation: draft.explanation ?? "",
        common_mistake: draft.common_mistake ?? null,
        topic: (draft.topic ?? "regulations") as never,
        difficulty: (draft.difficulty ?? "medium") as never,
        acs_code: draft.acs_code ?? "",
        source: draft.source ?? "",
        tags: (draft.tags ?? []) as string[],
        status: (draft.status ?? "draft") as never,
        locale: draft.locale ?? "en",
      };
      if (editing) await updateFn({ data: { id: editing.id, input: payload } });
      else await createFn({ data: payload });
      toast.success(t(editing ? "admin.questions.updated" : "admin.questions.created"));
      setDraft(null); setEditing(null); refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const onArchive = async (q: Q) => {
    try {
      await archiveFn({ data: { id: q.id, restore: q.status === "archived" } });
      toast.success(t(q.status === "archived" ? "admin.questions.restored" : "admin.questions.archived"));
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };
  const onDup = async (q: Q) => {
    try { await dupFn({ data: { id: q.id } }); toast.success(t("admin.questions.duplicated")); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  if (authLoading || rolesLoading) return <AdminAppShell><div className="p-8 text-sm text-muted-foreground">{t("common.loading")}</div></AdminAppShell>;
  if (!isAdmin) return (
    <AdminAppShell>
      <div className="mx-auto max-w-md p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Access denied</h1>
        <Link to="/dashboard" className="mt-6 inline-flex rounded-full bg-foreground px-4 py-2 text-sm text-background">Volver</Link>
      </div>
    </AdminAppShell>
  );

  return (
    <AdminAppShell>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{t("admin.questions.title")}</h1>
            <p className="text-sm text-muted-foreground">{counts.total} total · {counts.published} {t("admin.status.published").toLowerCase()} · {counts.draft} {t("admin.status.draft").toLowerCase()} · {counts.archived} {t("admin.status.archived").toLowerCase()}</p>
          </div>
          <Button onClick={() => openEditor(null)}><Plus className="mr-1.5 h-4 w-4" /> {t("admin.questions.new")}</Button>
        </header>

        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.questions.searchPh")} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("admin.common.allStatus")}</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{t(`admin.status.${s}`)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("admin.common.allTopics")}</SelectItem>{TOPICS.map(tp => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={diffFilter} onValueChange={setDiffFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("admin.common.allDifficulty")}</SelectItem>{DIFFS.map(d => <SelectItem key={d} value={d}>{t(`admin.diff.${d}`)}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {!items ? (
          <div className="rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">{t("admin.common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">{t("admin.common.empty")}</div>
        ) : isMobile ? (
          <div className="space-y-2">
            {filtered.map((q) => (
              <button key={q.id} onClick={() => openEditor(q)} className="block w-full rounded-2xl border border-border/60 bg-card/40 p-4 text-left">
                <div className="text-sm line-clamp-2">{q.question}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="secondary">{q.topic}</Badge>
                  <Badge variant="secondary">{t(`admin.diff.${q.difficulty}`)}</Badge>
                  <Badge variant={q.status === "published" ? "default" : "secondary"}>{t(`admin.status.${q.status}`)}</Badge>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">{t("admin.questions.question")}</th>
                  <th className="px-3 py-2 text-left">{t("admin.common.topic")}</th>
                  <th className="px-3 py-2 text-left">{t("admin.common.difficulty")}</th>
                  <th className="px-3 py-2 text-left">{t("admin.common.acsCode")}</th>
                  <th className="px-3 py-2 text-left">{t("admin.common.status")}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map((q) => (
                  <tr key={q.id} className="border-t border-border/40 hover:bg-accent/30">
                    <td className="max-w-md px-3 py-2"><button onClick={() => openEditor(q)} className="text-left line-clamp-2 hover:underline">{q.question}</button></td>
                    <td className="px-3 py-2">{q.topic}</td>
                    <td className="px-3 py-2">{t(`admin.diff.${q.difficulty}`)}</td>
                    <td className="px-3 py-2 text-xs">{q.acs_code}</td>
                    <td className="px-3 py-2"><Badge variant={q.status === "published" ? "default" : "secondary"}>{t(`admin.status.${q.status}`)}</Badge></td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => onDup(q)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent" title={t("admin.common.duplicate")}><Copy className="h-4 w-4" /></button>
                        <button onClick={() => onArchive(q)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent" title={q.status === "archived" ? t("admin.common.restore") : t("admin.common.archive")}>
                          {q.status === "archived" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 500 && <div className="border-t border-border/40 p-2 text-center text-xs text-muted-foreground">Showing first 500 of {filtered.length}</div>}
          </div>
        )}
      </div>

      <Sheet open={!!draft} onOpenChange={(o) => { if (!o) { setDraft(null); setEditing(null); } }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>{editing ? t("admin.questions.edit") : t("admin.questions.new")}</SheetTitle></SheetHeader>
          {draft && (
            <div className="mt-4 grid gap-3">
              {editing && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="secondary">{t("admin.common.version")} {editing.version ?? 1}</Badge>
                  <Badge variant="secondary">{t(`admin.status.${editing.status}`)}</Badge>
                  {editing.updated_at && <span>{t("admin.common.updated")}: {new Date(editing.updated_at).toLocaleString()}</span>}
                  {editing.updated_by && <span>· {t("admin.common.updatedBy")}: {editing.updated_by.slice(0, 8)}</span>}
                </div>
              )}
              <label className="text-xs"><span className="text-muted-foreground">{t("admin.questions.question")}</span>
                <Textarea rows={3} value={draft.question ?? ""} onChange={(e) => setDraft({ ...draft, question: e.target.value })} /></label>
              <div className="grid gap-2">
                <span className="text-xs text-muted-foreground">{t("admin.questions.options")}</span>
                {[0,1,2,3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" checked={draft.correct_index === i} onChange={() => setDraft({ ...draft, correct_index: i })} className="h-4 w-4" />
                    <Input value={(draft.options ?? ["","","",""])[i] ?? ""} onChange={(e) => {
                      const opts = [...((draft.options as string[]) ?? ["","","",""])]; opts[i] = e.target.value;
                      setDraft({ ...draft, options: opts });
                    }} placeholder={`Option ${i+1}`} />
                  </div>
                ))}
              </div>
              <label className="text-xs"><span className="text-muted-foreground">{t("admin.questions.explanation")}</span>
                <Textarea rows={4} value={draft.explanation ?? ""} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} />
                <span className="text-[10px] text-muted-foreground">{t("admin.questions.explanationHint", { count: (draft.explanation ?? "").split(/\s+/).filter(Boolean).length })}</span>
              </label>
              <label className="text-xs"><span className="text-muted-foreground">{t("admin.questions.commonMistake")}</span>
                <Textarea rows={2} value={draft.common_mistake ?? ""} onChange={(e) => setDraft({ ...draft, common_mistake: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.topic")}</span>
                  <Select value={draft.topic ?? "regulations"} onValueChange={(v) => setDraft({ ...draft, topic: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TOPICS.map(tp => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
                  </Select></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.difficulty")}</span>
                  <Select value={draft.difficulty ?? "medium"} onValueChange={(v) => setDraft({ ...draft, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIFFS.map(d => <SelectItem key={d} value={d}>{t(`admin.diff.${d}`)}</SelectItem>)}</SelectContent>
                  </Select></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.acsCode")}</span>
                  <Input value={draft.acs_code ?? ""} onChange={(e) => setDraft({ ...draft, acs_code: e.target.value })} /></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.source")}</span>
                  <Input value={draft.source ?? ""} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.status")}</span>
                  <Select value={draft.status ?? "draft"} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{t(`admin.status.${s}`)}</SelectItem>)}</SelectContent>
                  </Select></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.locale")}</span>
                  <Select value={draft.locale ?? "en"} onValueChange={(v) => setDraft({ ...draft, locale: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LOCALES.map(lc => <SelectItem key={lc} value={lc}>{lc}</SelectItem>)}</SelectContent>
                  </Select></label>
              </div>
              <label className="text-xs"><span className="text-muted-foreground">{t("admin.questions.tags")}</span>
                <Input value={(draft.tags ?? []).join(", ")} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} /></label>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t("admin.questions.previewQuiz")}</div>
                <div className="text-sm font-medium">{draft.question}</div>
                <div className="mt-2 grid gap-1.5">
                  {(draft.options ?? []).map((o, i) => (
                    <button key={i} type="button" onClick={() => setPreviewIdx(i)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                        previewIdx === null ? "border-border/60" :
                        i === draft.correct_index ? "border-emerald-500/60 bg-emerald-500/10" :
                        i === previewIdx ? "border-destructive/60 bg-destructive/10" : "border-border/60"
                      }`}>
                      {previewIdx !== null && i === draft.correct_index && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      <span>{o || <em className="text-muted-foreground">empty</em>}</span>
                    </button>
                  ))}
                </div>
                {previewIdx !== null && (
                  <div className="mt-3 space-y-2 text-xs">
                    <div><span className="font-semibold">{t("admin.questions.explanation")}: </span>{draft.explanation}</div>
                    {draft.common_mistake && <div><span className="font-semibold">{t("admin.questions.commonMistake")}: </span>{draft.common_mistake}</div>}
                    <div className="text-muted-foreground">{t("admin.common.source")}: {draft.source} · {t("admin.common.acsCode")}: {draft.acs_code}</div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 -mx-6 mt-2 flex justify-end gap-2 border-t border-border/60 bg-background/95 px-6 py-3 backdrop-blur">
                <Button variant="ghost" onClick={() => { setDraft(null); setEditing(null); }}>{t("admin.common.cancel")}</Button>
                <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} {t("admin.common.save")}</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminAppShell>
  );
}
