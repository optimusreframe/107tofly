import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Search, Save, Archive, RotateCcw, Copy, ExternalLink, Loader2, Send, Plus } from "lucide-react";
import { AdminAppShell } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import {
  getAdminLandingSections,
  upsertAdminLandingSection,
  publishAdminLandingSection,
  archiveAdminLandingSection,
  duplicateAdminLandingSection,
} from "@/server/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/landing")({
  head: () => ({ meta: [{ title: "Landing CMS — Admin · 107toFly" }, { name: "robots", content: "noindex" }] }),
  component: AdminLandingPage,
});

type Section = {
  id: string; section_key: string; locale: string;
  title: string | null; subtitle: string | null; body: string | null;
  cta_label: string | null; cta_href: string | null;
  image_url: string | null; video_url: string | null;
  content: Record<string, unknown> | null;
  status: string; sort_order: number; updated_at?: string;
};

const STATUSES = ["draft", "published", "archived"] as const;
const LOCALES = ["en", "es"] as const;

function AdminLandingPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const fetchList = useServerFn(getAdminLandingSections);
  const upsertFn = useServerFn(upsertAdminLandingSection);
  const publishFn = useServerFn(publishAdminLandingSection);
  const archiveFn = useServerFn(archiveAdminLandingSection);
  const dupFn = useServerFn(duplicateAdminLandingSection);

  const [items, setItems] = useState<Section[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [localeFilter, setLocaleFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Section | null>(null);
  const [draft, setDraft] = useState<Partial<Section> & { contentText?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  const refresh = () => {
    if (!isAdmin) return;
    fetchList().then((r) => setItems(r.sections as Section[])).catch((e) => toast.error(e?.message ?? "Error"));
  };
  useEffect(refresh, [isAdmin]); // eslint-disable-line

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (localeFilter !== "all" && s.locale !== localeFilter) return false;
      if (q && !`${s.section_key} ${s.title ?? ""} ${s.body ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, statusFilter, localeFilter]);

  const openEdit = (s: Section | null) => {
    setEditing(s);
    setDraft(s
      ? { ...s, contentText: JSON.stringify(s.content ?? {}, null, 2) }
      : { section_key: "", locale: "en", status: "draft", sort_order: 99, contentText: "{}" });
  };

  const saveDraft = async () => {
    if (!draft) return;
    let parsedContent: Record<string, unknown> = {};
    try { parsedContent = JSON.parse(draft.contentText || "{}"); } catch { toast.error("Invalid JSON in content"); return; }
    if (!draft.section_key) { toast.error("section_key required"); return; }
    setSaving(true);
    try {
      const { contentText: _ct, id: _id, updated_at: _ua, ...rest } = draft;
      void _ct; void _id; void _ua;
      const input = { ...rest, content: parsedContent } as Parameters<typeof upsertFn>[0]["data"]["input"];
      await upsertFn({ data: { id: editing?.id, input } });
      toast.success(t("admin.common.saved"));
      setEditing(null); setDraft(null);
      refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  if (authLoading || rolesLoading) {
    return <AdminAppShell><div className="grid min-h-[40vh] place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div></AdminAppShell>;
  }
  if (!isAdmin) {
    return <AdminAppShell><div className="mx-auto max-w-md p-8 text-center"><h1 className="text-2xl font-semibold">Access denied</h1><p className="mt-2 text-muted-foreground">Admin only.</p></div></AdminAppShell>;
  }

  return (
    <AdminAppShell>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{t("admin.landing.title", { defaultValue: "Landing CMS" })}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.landing.subtitle", { defaultValue: "Manage public landing sections per locale." })}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><a href="/" target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />{t("admin.landing.openLanding", { defaultValue: "Open landing" })}</a></Button>
            <Button onClick={() => openEdit(null)}><Plus className="mr-2 h-4 w-4" />{t("admin.common.create")}</Button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/50 p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={t("admin.common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("admin.common.allStatus")}</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={localeFilter} onValueChange={setLocaleFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All locales</SelectItem>{LOCALES.map((l) => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="p-3 text-left">Key</th><th className="p-3 text-left">Title</th><th className="p-3">Locale</th><th className="p-3">Status</th><th className="p-3">Order</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border/50 hover:bg-accent/30">
                  <td className="p-3 font-mono text-xs">{s.section_key}</td>
                  <td className="p-3">{s.title ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3 text-center"><Badge variant="outline">{s.locale}</Badge></td>
                  <td className="p-3 text-center"><Badge variant={s.status === "published" ? "default" : s.status === "archived" ? "secondary" : "outline"}>{s.status}</Badge></td>
                  <td className="p-3 text-center text-muted-foreground">{s.sort_order}</td>
                  <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => openEdit(s)}>{t("admin.common.edit")}</Button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t("admin.common.empty")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!draft} onOpenChange={(o) => { if (!o) { setDraft(null); setEditing(null); } }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>{editing ? t("admin.landing.edit", { defaultValue: "Edit section" }) : t("admin.landing.new", { defaultValue: "New section" })}</SheetTitle></SheetHeader>
          {draft && (
            <div className="mt-4 space-y-3">
              <Field label={t("admin.landing.sectionKey", { defaultValue: "Section key" })}>
                <Input value={draft.section_key ?? ""} disabled={!!editing} onChange={(e) => setDraft({ ...draft, section_key: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Locale">
                  <Select value={draft.locale ?? "en"} onValueChange={(v) => setDraft({ ...draft, locale: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LOCALES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={draft.status ?? "draft"} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label={t("admin.landing.titleField", { defaultValue: "Title" })}><Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
              <Field label={t("admin.landing.subtitle", { defaultValue: "Subtitle" })}><Input value={draft.subtitle ?? ""} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} /></Field>
              <Field label={t("admin.landing.body", { defaultValue: "Body" })}><Textarea rows={4} value={draft.body ?? ""} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("admin.landing.ctaLabel", { defaultValue: "CTA label" })}><Input value={draft.cta_label ?? ""} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} /></Field>
                <Field label={t("admin.landing.ctaHref", { defaultValue: "CTA URL" })}><Input value={draft.cta_href ?? ""} onChange={(e) => setDraft({ ...draft, cta_href: e.target.value })} /></Field>
              </div>
              <Field label={t("admin.landing.imageUrl", { defaultValue: "Image URL" })}><Input value={draft.image_url ?? ""} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} placeholder="Paste from /admin/media" /></Field>
              <Field label={t("admin.landing.videoUrl", { defaultValue: "Video URL" })}><Input value={draft.video_url ?? ""} onChange={(e) => setDraft({ ...draft, video_url: e.target.value })} /></Field>
              <Field label={t("admin.landing.sortOrder", { defaultValue: "Sort order" })}><Input type="number" value={draft.sort_order ?? 0} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} /></Field>
              <Field label={t("admin.landing.contentJson", { defaultValue: "Content JSON" })}>
                <Textarea rows={5} className="font-mono text-xs" value={draft.contentText ?? "{}"} onChange={(e) => setDraft({ ...draft, contentText: e.target.value })} />
              </Field>

              {draft.image_url && <img src={draft.image_url} alt="" className="max-h-40 rounded-xl border border-border object-contain" />}

              <div className="flex flex-wrap gap-2 pt-3">
                <Button onClick={saveDraft} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{t("admin.common.save")}</Button>
                {editing && (
                  <>
                    <Button variant="outline" onClick={async () => { await publishFn({ data: { id: editing.id } }); toast.success("Published"); refresh(); setDraft(null); setEditing(null); }}><Send className="mr-2 h-4 w-4" />{t("admin.landing.publish", { defaultValue: "Publish" })}</Button>
                    <Button variant="outline" onClick={async () => { const target = editing.locale === "en" ? "es" : "en"; await dupFn({ data: { id: editing.id, targetLocale: target } }); toast.success("Duplicated"); refresh(); }}><Copy className="mr-2 h-4 w-4" />{t("admin.landing.duplicate", { defaultValue: "Duplicate" })}</Button>
                    <Button variant="outline" onClick={async () => { const restore = editing.status === "archived"; await archiveFn({ data: { id: editing.id, restore } }); toast.success(restore ? "Restored" : "Archived"); refresh(); setDraft(null); setEditing(null); }}>
                      {editing.status === "archived" ? <><RotateCcw className="mr-2 h-4 w-4" />{t("admin.common.restore")}</> : <><Archive className="mr-2 h-4 w-4" />{t("admin.common.archive")}</>}
                    </Button>
                  </>
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
