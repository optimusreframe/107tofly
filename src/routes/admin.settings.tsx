import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, RotateCcw, AlertTriangle } from "lucide-react";
import { AdminAppShell } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { getAdminSettings, updateAdminSettingsBulk } from "@/server/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin · 107toFly" }, { name: "robots", content: "noindex" }] }),
  component: AdminSettingsPage,
});

type Setting = { id: string; key: string; value: unknown; category: string; description: string | null; is_public: boolean; updated_at: string };

const SECTIONS: { id: string; categories: string[]; titleKey: string; defaultLabel: string }[] = [
  { id: "general", categories: ["general"], titleKey: "admin.settings.tabs.general", defaultLabel: "General" },
  { id: "study", categories: ["study"], titleKey: "admin.settings.tabs.study", defaultLabel: "Study & XP" },
  { id: "certificate", categories: ["certificate"], titleKey: "admin.settings.tabs.certRules", defaultLabel: "Certificate Rules" },
  { id: "features", categories: ["features"], titleKey: "admin.settings.tabs.features", defaultLabel: "Feature Flags" },
  { id: "legal", categories: ["legal"], titleKey: "admin.settings.tabs.legal", defaultLabel: "Legal / Disclaimers" },
];

// Map settings to their UI sections (legal pulls from certificate.disclaimer_*)
const LEGAL_KEYS = ["certificate.disclaimer_en", "certificate.disclaimer_es"];

function inferType(key: string, value: unknown): "string" | "number" | "boolean" | "json" | "textarea" {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) return "json";
  if (key.includes("disclaimer")) return "textarea";
  return "string";
}

function AdminSettingsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const fetchFn = useServerFn(getAdminSettings);
  const saveFn = useServerFn(updateAdminSettingsBulk);

  const [settings, setSettings] = useState<Setting[] | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [confirmMaint, setConfirmMaint] = useState<{ key: string; value: boolean } | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  const refresh = () => {
    if (!isAdmin) return;
    fetchFn().then((r) => {
      const list = (r.settings ?? []) as Setting[];
      setSettings(list);
      const d: Record<string, unknown> = {};
      for (const s of list) d[s.key] = s.value;
      setDraft(d);
    }).catch((e) => toast.error((e as Error).message));
  };
  useEffect(refresh, [isAdmin]); // eslint-disable-line

  const dirtyKeys = useMemo(() => {
    if (!settings) return [];
    return settings
      .filter((s) => JSON.stringify(s.value) !== JSON.stringify(draft[s.key]))
      .map((s) => s.key);
  }, [settings, draft]);

  const saveSection = async (sectionId: string) => {
    if (!settings) return;
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;
    const inSection = (s: Setting) => sectionId === "legal"
      ? LEGAL_KEYS.includes(s.key)
      : section.categories.includes(s.category) && !LEGAL_KEYS.includes(s.key);
    const payload: Record<string, unknown> = {};
    for (const s of settings) {
      if (inSection(s) && dirtyKeys.includes(s.key)) payload[s.key] = draft[s.key];
    }
    if (!Object.keys(payload).length) { toast.info(t("admin.settings.noChanges", { defaultValue: "No changes" })); return; }
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (saveFn as any)({ data: { settings: payload } });
      toast.success(t("admin.common.saved"));
      refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const saveSingle = async (key: string) => {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (saveFn as any)({ data: { settings: { [key]: draft[key] } } });
      toast.success(t("admin.common.saved"));
      refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const resetSection = (sectionId: string) => {
    if (!settings) return;
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;
    const next = { ...draft };
    for (const s of settings) {
      const isLegal = LEGAL_KEYS.includes(s.key);
      const match = sectionId === "legal" ? isLegal : section.categories.includes(s.category) && !isLegal;
      if (match) next[s.key] = s.value;
    }
    setDraft(next);
  };

  const setVal = (key: string, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));

  if (authLoading || rolesLoading) return <AdminAppShell><div className="grid min-h-[40vh] place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div></AdminAppShell>;
  if (!isAdmin) return <AdminAppShell><div className="mx-auto max-w-md p-8 text-center"><h1 className="text-2xl font-semibold">Access denied</h1></div></AdminAppShell>;

  const sectionSettings = (sectionId: string): Setting[] => {
    if (!settings) return [];
    if (sectionId === "legal") return settings.filter((s) => LEGAL_KEYS.includes(s.key));
    const section = SECTIONS.find((s) => s.id === sectionId);
    return settings.filter((s) => section?.categories.includes(s.category) && !LEGAL_KEYS.includes(s.key));
  };

  const renderField = (s: Setting) => {
    const type = inferType(s.key, s.value);
    const val = draft[s.key];
    const isDirty = dirtyKeys.includes(s.key);

    if (type === "boolean") {
      return (
        <div key={s.key} className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card/40 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">{s.key}{isDirty && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-600">dirty</span>}</div>
            {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
            {s.key === "features.maintenance_mode" && val === true && (
              <p className="mt-2 flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3 w-3" />{t("admin.settings.maintenanceWarn", { defaultValue: "Maintenance mode is on." })}</p>
            )}
            {(s.key === "features.payments_enabled" || s.key === "features.media_uploads_enabled") && (
              <p className="mt-1 text-[11px] text-muted-foreground">{t("admin.settings.placeholderHint", { defaultValue: "Setting saved. Runtime enforcement coming soon." })}</p>
            )}
          </div>
          <Switch
            checked={Boolean(val)}
            onCheckedChange={(v) => {
              if (s.key === "features.maintenance_mode" && v) { setConfirmMaint({ key: s.key, value: true }); return; }
              setVal(s.key, v);
            }}
          />
        </div>
      );
    }

    if (type === "number") {
      return (
        <FieldRow key={s.key} s={s} isDirty={isDirty} onSave={() => saveSingle(s.key)}>
          <Input type="number" value={Number(val ?? 0)} onChange={(e) => setVal(s.key, Number(e.target.value))} />
        </FieldRow>
      );
    }

    if (type === "json") {
      return (
        <FieldRow key={s.key} s={s} isDirty={isDirty} onSave={() => saveSingle(s.key)}>
          <Input value={Array.isArray(val) ? (val as string[]).join(",") : ""} onChange={(e) => setVal(s.key, e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} />
        </FieldRow>
      );
    }

    if (type === "textarea") {
      return (
        <FieldRow key={s.key} s={s} isDirty={isDirty} onSave={() => saveSingle(s.key)}>
          <Textarea rows={4} value={String(val ?? "")} onChange={(e) => setVal(s.key, e.target.value)} />
        </FieldRow>
      );
    }

    return (
      <FieldRow key={s.key} s={s} isDirty={isDirty} onSave={() => saveSingle(s.key)}>
        <Input value={String(val ?? "")} onChange={(e) => setVal(s.key, e.target.value)} />
      </FieldRow>
    );
  };

  return (
    <AdminAppShell>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{t("admin.settings.title", { defaultValue: "Settings" })}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.settings.subtitle", { defaultValue: "Platform-wide configuration." })}</p>
          </div>
          {dirtyKeys.length > 0 && (
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-600">{dirtyKeys.length} {t("admin.settings.dirty", { defaultValue: "unsaved" })}</span>
          )}
        </div>

        {settings === null ? (
          <div className="grid min-h-[30vh] place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="general">
            <TabsList className="flex flex-wrap">
              {SECTIONS.map((s) => (
                <TabsTrigger key={s.id} value={s.id}>{t(s.titleKey, { defaultValue: s.defaultLabel })}</TabsTrigger>
              ))}
            </TabsList>
            {SECTIONS.map((s) => (
              <TabsContent key={s.id} value={s.id} className="mt-4 space-y-3">
                {sectionSettings(s.id).map(renderField)}
                {sectionSettings(s.id).length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">{t("admin.common.empty")}</div>}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => saveSection(s.id)} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t("admin.settings.saveSection", { defaultValue: "Save section" })}
                  </Button>
                  <Button variant="outline" onClick={() => resetSection(s.id)}>
                    <RotateCcw className="mr-2 h-4 w-4" />{t("admin.settings.reset", { defaultValue: "Reset" })}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      <AlertDialog open={!!confirmMaint} onOpenChange={(o) => { if (!o) setConfirmMaint(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.settings.maintenanceConfirmTitle", { defaultValue: "Enable maintenance mode?" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.settings.maintenanceConfirm", { defaultValue: "This may block student access in future runtime enforcement." })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmMaint) { setVal(confirmMaint.key, confirmMaint.value); setConfirmMaint(null); } }}>{t("common.continue")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminAppShell>
  );
}

function FieldRow({ s, isDirty, onSave, children }: { s: Setting; isDirty: boolean; onSave: () => void; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{s.key}{isDirty && <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-600">dirty</span>}</div>
        <Button size="sm" variant="ghost" onClick={onSave} disabled={!isDirty}><Save className="mr-1 h-3 w-3" />{t("admin.common.save")}</Button>
      </div>
      {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
      <div className="mt-3">{children}</div>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">Updated {new Date(s.updated_at).toLocaleString()}</p>
    </div>
  );
}
