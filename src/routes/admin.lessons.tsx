import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Search, Plus, Copy, Archive, RotateCcw, ExternalLink, Save, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AdminAppShell } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { useDeviceMode } from "@/hooks/use-device-mode";
import {
  getAdminLessons,
  createAdminLesson,
  updateAdminLesson,
  archiveAdminLesson,
  duplicateAdminLesson,
} from "@/server/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/lessons")({
  head: () => ({ meta: [{ title: "Lessons — Admin · 107toFly" }, { name: "robots", content: "noindex" }] }),
  component: AdminLessonsPage,
});

type Lesson = {
  id: string; slug: string; title: string; summary: string; body_md: string;
  topic: string; week: number; day: number; order_index: number; est_minutes: number;
  status: string; locale: string; sources: unknown; updated_at?: string;
  version?: number; updated_by?: string | null;
};

const TOPICS = ["regulations","airspace","sectional","weather","performance","operations","adm","emergencies","remote_id","maintenance"];
const STATUSES = ["draft","review","published","archived"] as const;
const LOCALES = ["en","es"] as const;

function AdminLessonsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const { isMobile } = useDeviceMode();
  const fetchList = useServerFn(getAdminLessons);
  const createFn = useServerFn(createAdminLesson);
  const updateFn = useServerFn(updateAdminLesson);
  const archiveFn = useServerFn(archiveAdminLesson);
  const dupFn = useServerFn(duplicateAdminLesson);

  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [draft, setDraft] = useState<Partial<Lesson> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  const refresh = () => {
    if (!isAdmin) return;
    fetchList().then((r) => setLessons(r.lessons as Lesson[])).catch((e) => toast.error(e?.message ?? "Error"));
  };
  useEffect(refresh, [isAdmin]); // eslint-disable-line

  const filtered = useMemo(() => {
    if (!lessons) return [];
    const q = search.trim().toLowerCase();
    return lessons.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (topicFilter !== "all" && l.topic !== topicFilter) return false;
      if (q && !`${l.title} ${l.slug} ${l.summary}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lessons, search, statusFilter, topicFilter]);

  const counts = useMemo(() => {
    const c = { total: lessons?.length ?? 0, published: 0, draft: 0, archived: 0 };
    for (const l of lessons ?? []) {
      if (l.status === "published") c.published++;
      else if (l.status === "archived") c.archived++;
      else c.draft++;
    }
    return c;
  }, [lessons]);

  const openEditor = (l: Lesson | null) => {
    setEditing(l);
    setDraft(l ?? {
      slug: "", title: "", summary: "", body_md: "", topic: "regulations",
      week: 1, day: 1, order_index: (lessons?.length ?? 0) + 1,
      est_minutes: 30, status: "draft", locale: "en", sources: [],
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const sources = typeof draft.sources === "string" ? JSON.parse(draft.sources as unknown as string) : (draft.sources ?? []);
      const payload = {
        slug: draft.slug ?? "", title: draft.title ?? "", summary: draft.summary ?? "",
        body_md: draft.body_md ?? "", topic: draft.topic as never,
        week: Number(draft.week ?? 1), day: Number(draft.day ?? 1),
        order_index: Number(draft.order_index ?? 0),
        est_minutes: Number(draft.est_minutes ?? 30),
        sources, status: (draft.status ?? "draft") as never,
        locale: draft.locale ?? "en", media_assets: [],
      };
      if (editing) await updateFn({ data: { id: editing.id, input: payload } });
      else await createFn({ data: payload });
      toast.success(t(editing ? "admin.lessons.updated" : "admin.lessons.created"));
      setEditing(null); setDraft(null); refresh();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.startsWith("LESSON_CONFLICT_WEEKDAY")) toast.error(t("admin.lessons.conflictWeekDay"));
      else if (msg.startsWith("LESSON_CONFLICT_ORDER")) toast.error(t("admin.lessons.conflictOrder"));
      else toast.error(msg);
    }
    finally { setSaving(false); }
  };

  const onArchive = async (l: Lesson) => {
    try {
      await archiveFn({ data: { id: l.id, restore: l.status === "archived" } });
      toast.success(l.status === "archived" ? "Restored" : "Archived");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };
  const onDuplicate = async (l: Lesson) => {
    try { await dupFn({ data: { id: l.id } }); toast.success("Duplicated"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  if (authLoading || rolesLoading) return <AdminAppShell><div className="p-8 text-sm text-muted-foreground">Cargando…</div></AdminAppShell>;
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
            <h1 className="font-display text-3xl font-semibold tracking-tight">{t("admin.lessons.title")}</h1>
            <p className="text-sm text-muted-foreground">{counts.total} total · {counts.published} {t("admin.status.published").toLowerCase()} · {counts.draft} {t("admin.status.draft").toLowerCase()} · {counts.archived} {t("admin.status.archived").toLowerCase()}</p>
          </div>
          <Button onClick={() => openEditor(null)}><Plus className="mr-1.5 h-4 w-4" /> {t("admin.lessons.new")}</Button>
        </header>

        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.lessons.searchPh")} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.common.allStatus")}</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`admin.status.${s}`)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.common.allTopics")}</SelectItem>
              {TOPICS.map((t2) => <SelectItem key={t2} value={t2}>{t2}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {!lessons ? (
          <div className="rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">{t("admin.common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">{t("admin.common.empty")}</div>
        ) : isMobile ? (
          <div className="space-y-2">
            {filtered.map((l) => (
              <button key={l.id} onClick={() => openEditor(l)} className="block w-full rounded-2xl border border-border/60 bg-card/40 p-4 text-left">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{l.title}</div>
                    <div className="text-xs text-muted-foreground">W{l.week}·D{l.day} · {l.topic}</div>
                  </div>
                  <Badge variant={l.status === "published" ? "default" : "secondary"}>{t(`admin.status.${l.status}`)}</Badge>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">{t("admin.common.title")}</th>
                  <th className="px-3 py-2 text-left">W/D</th>
                  <th className="px-3 py-2 text-left">{t("admin.common.topic")}</th>
                  <th className="px-3 py-2 text-left">{t("admin.common.status")}</th>
                  <th className="px-3 py-2 text-left">Min</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t border-border/40 hover:bg-accent/30">
                    <td className="px-3 py-2">
                      <button onClick={() => openEditor(l)} className="text-left font-medium hover:underline">{l.title}</button>
                      <div className="text-xs text-muted-foreground">{l.slug}</div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">W{l.week}·D{l.day}</td>
                    <td className="px-3 py-2">{l.topic}</td>
                    <td className="px-3 py-2"><Badge variant={l.status === "published" ? "default" : "secondary"}>{t(`admin.status.${l.status}`)}</Badge></td>
                    <td className="px-3 py-2 tabular-nums">{l.est_minutes}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {l.status === "published" && (
                          <Link to="/lessons/$slug" params={{ slug: l.slug }} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent" title={t("admin.lessons.openStudent")}><ExternalLink className="h-4 w-4" /></Link>
                        )}
                        <button onClick={() => onDuplicate(l)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent" title={t("admin.common.duplicate")}><Copy className="h-4 w-4" /></button>
                        <button onClick={() => onArchive(l)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent" title={l.status === "archived" ? t("admin.common.restore") : t("admin.common.archive")}>
                          {l.status === "archived" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={!!draft} onOpenChange={(o) => { if (!o) { setDraft(null); setEditing(null); } }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader><SheetTitle>{editing ? t("admin.lessons.edit") : t("admin.lessons.new")}</SheetTitle></SheetHeader>
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
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.title")}</span>
                  <Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.lessons.slug")}</span>
                  <Input value={draft.slug ?? ""} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></label>
              </div>
              <label className="text-xs"><span className="text-muted-foreground">{t("admin.lessons.summary")}</span>
                <Textarea rows={2} value={draft.summary ?? ""} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></label>
              <div className="grid grid-cols-4 gap-2">
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.lessons.week")}</span>
                  <Input type="number" value={draft.week ?? 1} onChange={(e) => setDraft({ ...draft, week: Number(e.target.value) })} /></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.lessons.day")}</span>
                  <Input type="number" value={draft.day ?? 1} onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })} /></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.lessons.orderIndex")}</span>
                  <Input type="number" value={draft.order_index ?? 0} onChange={(e) => setDraft({ ...draft, order_index: Number(e.target.value) })} /></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.lessons.estMinutes")}</span>
                  <Input type="number" value={draft.est_minutes ?? 30} onChange={(e) => setDraft({ ...draft, est_minutes: Number(e.target.value) })} /></label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.topic")}</span>
                  <Select value={draft.topic ?? "regulations"} onValueChange={(v) => setDraft({ ...draft, topic: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TOPICS.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
                  </Select></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.status")}</span>
                  <Select value={draft.status ?? "draft"} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`admin.status.${s}`)}</SelectItem>)}</SelectContent>
                  </Select></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.locale")}</span>
                  <Select value={draft.locale ?? "en"} onValueChange={(v) => setDraft({ ...draft, locale: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LOCALES.map((lc) => <SelectItem key={lc} value={lc}>{lc}</SelectItem>)}</SelectContent>
                  </Select></label>
              </div>
              <label className="text-xs"><span className="text-muted-foreground">{t("admin.lessons.bodyMd")}</span>
                <Textarea rows={10} value={draft.body_md ?? ""} onChange={(e) => setDraft({ ...draft, body_md: e.target.value })} className="font-mono text-xs" /></label>
              <label className="text-xs"><span className="text-muted-foreground">{t("admin.lessons.sources")} (JSON)</span>
                <Textarea rows={3} value={typeof draft.sources === "string" ? draft.sources : JSON.stringify(draft.sources ?? [], null, 2)}
                  onChange={(e) => setDraft({ ...draft, sources: e.target.value as unknown as never })} className="font-mono text-xs" /></label>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t("admin.lessons.markdownPreview")}</div>
                <article className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.body_md ?? ""}</ReactMarkdown>
                </article>
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
