import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Search, Save, Archive, RotateCcw, Copy as CopyIcon, Plus, Loader2 } from "lucide-react";
import { AdminAppShell } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import {
  getAdminMediaAssets,
  createAdminMediaAsset,
  updateAdminMediaAsset,
  archiveAdminMediaAsset,
} from "@/server/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/media")({
  head: () => ({ meta: [{ title: "Media — Admin · 107toFly" }, { name: "robots", content: "noindex" }] }),
  component: AdminMediaPage,
});

type Asset = {
  id: string; file_name: string; file_type: string; mime_type: string | null;
  file_size: number | null; storage_path: string | null; public_url: string | null;
  alt_text: string | null; caption: string | null; locale: string | null;
  tags: string[] | null; usage_context: string | null; status: string;
  metadata: Record<string, unknown> | null; created_at?: string;
};

const TYPES = ["image", "video", "pdf", "audio", "icon", "other"] as const;
const CONTEXTS = ["landing", "lesson", "question", "certificate", "general"] as const;

function AdminMediaPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const fetchList = useServerFn(getAdminMediaAssets);
  const createFn = useServerFn(createAdminMediaAsset);
  const updateFn = useServerFn(updateAdminMediaAsset);
  const archiveFn = useServerFn(archiveAdminMediaAsset);

  const [items, setItems] = useState<Asset[] | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [contextFilter, setContextFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Asset | null>(null);
  const [draft, setDraft] = useState<Partial<Asset> & { tagsText?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  const refresh = () => {
    if (!isAdmin) return;
    fetchList().then((r) => setItems(r.assets as Asset[])).catch((e) => toast.error(e?.message ?? "Error"));
  };
  useEffect(refresh, [isAdmin]); // eslint-disable-line

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (typeFilter !== "all" && a.file_type !== typeFilter) return false;
      if (contextFilter !== "all" && a.usage_context !== contextFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (q && !`${a.file_name} ${a.alt_text ?? ""} ${(a.tags ?? []).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, typeFilter, contextFilter, statusFilter]);

  const openEdit = (a: Asset | null) => {
    setEditing(a);
    setDraft(a
      ? { ...a, tagsText: (a.tags ?? []).join(", ") }
      : { file_name: "", file_type: "image", status: "active", locale: "en", tagsText: "" });
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.file_name || !draft.file_type) { toast.error("file_name and file_type required"); return; }
    setSaving(true);
    try {
      const tags = (draft.tagsText ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const { tagsText: _tt, id: _id, created_at: _c, ...rest } = draft;
      void _tt; void _id; void _c;
      const input = { ...rest, tags };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (editing) await (updateFn as any)({ data: { id: editing.id, input } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else await (createFn as any)({ data: { input } });
      toast.success(t("admin.common.saved"));
      setDraft(null); setEditing(null); refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const copyUrl = (u: string | null) => { if (u) { navigator.clipboard.writeText(u); toast.success("URL copied"); } };

  if (authLoading || rolesLoading) return <AdminAppShell><div className="grid min-h-[40vh] place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div></AdminAppShell>;
  if (!isAdmin) return <AdminAppShell><div className="mx-auto max-w-md p-8 text-center"><h1 className="text-2xl font-semibold">Access denied</h1></div></AdminAppShell>;

  return (
    <AdminAppShell>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{t("admin.media.title", { defaultValue: "Media Library" })}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.media.subtitle", { defaultValue: "Manage images, videos and PDFs by URL." })}</p>
          </div>
          <Button onClick={() => openEdit(null)}><Plus className="mr-2 h-4 w-4" />{t("admin.media.create", { defaultValue: "Create asset" })}</Button>
        </div>

        <div className="rounded-3xl border border-border bg-card/50 p-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={t("admin.common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All types</SelectItem>{TYPES.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={contextFilter} onValueChange={setContextFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All contexts</SelectItem>{CONTEXTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="active">active</SelectItem><SelectItem value="archived">archived</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((a) => (
            <div key={a.id} className="group rounded-2xl border border-border bg-card/40 p-3 transition hover:border-primary/40">
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
                {a.file_type === "image" && a.public_url ? (
                  <img src={a.public_url} alt={a.alt_text ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-xs uppercase tracking-wide text-muted-foreground">{a.file_type}</div>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium" title={a.file_name}>{a.file_name}</div>
                <Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <span>{a.usage_context ?? "—"}</span>
                <span>·</span>
                <span>{a.locale ?? "—"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>{t("admin.common.edit")}</Button>
                <Button size="sm" variant="ghost" onClick={() => copyUrl(a.public_url)}><CopyIcon className="mr-1 h-3 w-3" />URL</Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full p-8 text-center text-muted-foreground">{t("admin.common.empty")}</div>}
        </div>
      </div>

      <Sheet open={!!draft} onOpenChange={(o) => { if (!o) { setDraft(null); setEditing(null); } }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>{editing ? t("admin.media.edit", { defaultValue: "Edit asset" }) : t("admin.media.create", { defaultValue: "Create asset" })}</SheetTitle></SheetHeader>
          {draft && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("admin.media.fileName", { defaultValue: "File name" })}><Input value={draft.file_name ?? ""} onChange={(e) => setDraft({ ...draft, file_name: e.target.value })} /></Field>
                <Field label={t("admin.media.fileType", { defaultValue: "File type" })}>
                  <Select value={draft.file_type ?? "image"} onValueChange={(v) => setDraft({ ...draft, file_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label={t("admin.media.publicUrl", { defaultValue: "Public URL" })}><Input value={draft.public_url ?? ""} onChange={(e) => setDraft({ ...draft, public_url: e.target.value })} placeholder="https://..." /></Field>
              <Field label={t("admin.media.altText", { defaultValue: "Alt text" })}><Input value={draft.alt_text ?? ""} onChange={(e) => setDraft({ ...draft, alt_text: e.target.value })} /></Field>
              <Field label={t("admin.media.caption", { defaultValue: "Caption" })}><Textarea rows={2} value={draft.caption ?? ""} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Locale">
                  <Select value={draft.locale ?? "en"} onValueChange={(v) => setDraft({ ...draft, locale: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="en">en</SelectItem><SelectItem value="es">es</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label={t("admin.media.usageContext", { defaultValue: "Usage context" })}>
                  <Select value={draft.usage_context ?? "general"} onValueChange={(v) => setDraft({ ...draft, usage_context: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONTEXTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label={t("admin.media.tags", { defaultValue: "Tags (comma)" })}><Input value={draft.tagsText ?? ""} onChange={(e) => setDraft({ ...draft, tagsText: e.target.value })} /></Field>
              <Field label={t("admin.media.mimeType", { defaultValue: "MIME type" })}><Input value={draft.mime_type ?? ""} onChange={(e) => setDraft({ ...draft, mime_type: e.target.value })} /></Field>

              {draft.public_url && draft.file_type === "image" && <img src={draft.public_url} alt="" className="max-h-48 rounded-xl border border-border object-contain" />}

              <div className="flex flex-wrap gap-2 pt-3">
                <Button onClick={saveDraft} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{t("admin.common.save")}</Button>
                {editing && (
                  <Button variant="outline" onClick={async () => { const restore = editing.status === "archived"; await archiveFn({ data: { id: editing.id, restore } }); toast.success(restore ? "Restored" : "Archived"); refresh(); setDraft(null); setEditing(null); }}>
                    {editing.status === "archived" ? <><RotateCcw className="mr-2 h-4 w-4" />{t("admin.common.restore")}</> : <><Archive className="mr-2 h-4 w-4" />{t("admin.common.archive")}</>}
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminAppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
