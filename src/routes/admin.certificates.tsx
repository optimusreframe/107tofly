import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, ExternalLink, Copy as CopyIcon, ShieldX, RefreshCw, Download } from "lucide-react";
import { AdminAppShell } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { usePublicRuntime } from "@/hooks/use-public-runtime";
import {
  getAdminCertificates,
  getAdminCertificateDetail,
  revokeAdminCertificate,
  reissueAdminCertificate,
} from "@/server/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/certificates")({
  head: () => ({ meta: [{ title: "Certificates — Admin · 107toFly" }, { name: "robots", content: "noindex" }] }),
  component: AdminCertsPage,
});

type Cert = {
  id: string; user_id: string; display_name: string; final_score: number;
  modules_completed: number; hours_estimated: number; issued_at: string;
  status: string; revoked_at: string | null; revoke_reason: string | null;
  email: string | null;
};

function AdminCertsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const fetchList = useServerFn(getAdminCertificates);
  const fetchDetail = useServerFn(getAdminCertificateDetail);
  const revokeFn = useServerFn(revokeAdminCertificate);
  const reissueFn = useServerFn(reissueAdminCertificate);
  const runtime = usePublicRuntime();
  const certCfg = (runtime?.certificate ?? {}) as Record<string, unknown>;
  const templateStyle = String(certCfg["certificate.template_style"] ?? "premium");
  const isEs = i18n.language?.startsWith("es");
  const previewDisclaimer = isEs
    ? String(certCfg["certificate.disclaimer_es"] ?? t("verify.note"))
    : String(certCfg["certificate.disclaimer_en"] ?? t("verify.note"));

  const [items, setItems] = useState<Cert[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detail, setDetail] = useState<any | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<Cert | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [confirmReissue, setConfirmReissue] = useState<Cert | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  const refresh = () => {
    if (!isAdmin) return;
    fetchList().then((r) => setItems(r.certificates as Cert[])).catch((e) => toast.error((e as Error).message));
  };
  useEffect(refresh, [isAdmin]); // eslint-disable-line

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fetchDetail as any)({ data: { id: openId } }).then(setDetail).catch((e: Error) => toast.error(e.message));
  }, [openId, fetchDetail]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q && !`${c.display_name} ${c.email ?? ""} ${c.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, statusFilter]);

  const verifyUrl = (id: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${id}`;
  const copyUrl = (id: string) => { navigator.clipboard.writeText(verifyUrl(id)); toast.success("URL copied"); };

  const doRevoke = async () => {
    if (!confirmRevoke || !revokeReason.trim()) return;
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (revokeFn as any)({ data: { id: confirmRevoke.id, reason: revokeReason.trim() } });
      toast.success(t("admin.certs.revoked", { defaultValue: "Certificate revoked" }));
      setConfirmRevoke(null); setRevokeReason(""); refresh();
      if (openId === confirmRevoke.id) setOpenId(null);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const doReissue = async () => {
    if (!confirmReissue) return;
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await (reissueFn as any)({ data: { id: confirmReissue.id } });
      toast.success(t("admin.certs.reissued", { defaultValue: "Certificate reissued" }));
      setConfirmReissue(null); refresh();
      setOpenId(r?.certificate?.id ?? null);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  if (authLoading || rolesLoading) return <AdminAppShell><div className="grid min-h-[40vh] place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div></AdminAppShell>;
  if (!isAdmin) return <AdminAppShell><div className="mx-auto max-w-md p-8 text-center"><h1 className="text-2xl font-semibold">Access denied</h1></div></AdminAppShell>;

  return (
    <AdminAppShell>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("admin.certs.title", { defaultValue: "Certificates" })}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.certs.subtitle", { defaultValue: "Manage issued certificates and templates." })}</p>
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">{t("admin.certs.list", { defaultValue: "Issued" })}</TabsTrigger>
            <TabsTrigger value="template">{t("admin.certs.template", { defaultValue: "Template" })}</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4 space-y-4">
            <div className="rounded-3xl border border-border bg-card/50 p-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder={t("admin.common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="active">{t("admin.certs.active", { defaultValue: "Active" })}</SelectItem>
                    <SelectItem value="revoked">{t("admin.certs.revoked", { defaultValue: "Revoked" })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-3xl border border-border md:block">
              <table className="w-full text-sm">
                <thead className="bg-card/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">{t("admin.certs.student", { defaultValue: "Student" })}</th>
                    <th className="px-4 py-3 text-left">{t("admin.certs.issued", { defaultValue: "Issued" })}</th>
                    <th className="px-4 py-3 text-left">{t("admin.certs.score", { defaultValue: "Score" })}</th>
                    <th className="px-4 py-3 text-left">{t("admin.certs.status", { defaultValue: "Status" })}</th>
                    <th className="px-4 py-3 text-right">{t("admin.common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-accent/30 cursor-pointer" onClick={() => setOpenId(c.id)}>
                      <td className="px-4 py-3 font-mono text-xs">{c.id.slice(0, 8)}…</td>
                      <td className="px-4 py-3"><div className="font-medium">{c.display_name}</div><div className="text-xs text-muted-foreground">{c.email ?? "—"}</div></td>
                      <td className="px-4 py-3 text-xs">{new Date(c.issued_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{c.final_score}%</td>
                      <td className="px-4 py-3"><Badge variant={c.status === "active" ? "default" : "destructive"}>{c.status}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); copyUrl(c.id); }}><CopyIcon className="h-3 w-3" /></Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">{t("admin.common.empty")}</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {filtered.map((c) => (
                <button key={c.id} onClick={() => setOpenId(c.id)} className="rounded-2xl border border-border bg-card/40 p-4 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{c.display_name}</div>
                    <Badge variant={c.status === "active" ? "default" : "destructive"}>{c.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{c.email ?? "—"}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span>{c.final_score}%</span>
                    <span>{new Date(c.issued_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">{t("admin.common.empty")}</div>}
            </div>
          </TabsContent>

          <TabsContent value="template" className="mt-4 space-y-4">
            <div className="rounded-3xl border border-border bg-card/40 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">{t("admin.certs.preview", { defaultValue: "Preview" })}</h2>
                <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("admin.certs.style", { defaultValue: "Style" })}: {templateStyle}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("admin.certs.templateHint", { defaultValue: "Edit copy in Settings → Legal. Change template_style in Settings → Certificate Rules." })}</p>
              <div className={`mt-6 rounded-2xl p-8 text-center ${
                templateStyle === "minimal"
                  ? "border-2 border-foreground bg-background"
                  : templateStyle === "classic"
                    ? "border-4 border-amber-700/60 bg-amber-50 text-amber-950"
                    : "border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
              }`}>
                <div className={`font-display ${templateStyle === "classic" ? "text-2xl" : "text-3xl"} font-bold tracking-tight`}>
                  {templateStyle === "classic" ? "107toFly — Certificate of Completion" : templateStyle === "minimal" ? "Certificate of Completion · 107toFly" : "Certificate of Completion"}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.3em] opacity-70">107toFly</div>
                <div className="mt-8 text-sm opacity-80">This certifies that</div>
                <div className="mt-1 font-display text-2xl font-semibold">[Student Name]</div>
                <div className="mt-4 text-sm opacity-80">has completed the Part 107 prep course</div>
                <div className="mt-6 flex items-center justify-center gap-6 text-xs opacity-80">
                  <div><div className="font-semibold">[Date]</div>Issued</div>
                  <div><div className="font-semibold">[Score]%</div>Final</div>
                  <div><div className="font-semibold">56h</div>Estimated</div>
                </div>
                <p className="mt-6 text-[10px] leading-relaxed opacity-70">{previewDisclaimer}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!openId} onOpenChange={(o) => { if (!o) setOpenId(null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader><SheetTitle>{t("admin.certs.detail", { defaultValue: "Certificate detail" })}</SheetTitle></SheetHeader>
          {!detail ? (
            <div className="grid min-h-[30vh] place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !detail.certificate ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Not found</div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-border bg-card/40 p-4">
                <div className="flex items-center justify-between">
                  <Badge variant={detail.certificate.status === "active" ? "default" : "destructive"}>{detail.certificate.status}</Badge>
                  <span className="font-mono text-xs">{detail.certificate.id}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Info label={t("admin.certs.student", { defaultValue: "Student" })} value={detail.certificate.display_name} />
                  <Info label="Email" value={detail.email ?? "—"} />
                  <Info label={t("admin.certs.issued", { defaultValue: "Issued" })} value={new Date(detail.certificate.issued_at).toLocaleString()} />
                  <Info label={t("admin.certs.score", { defaultValue: "Score" })} value={`${detail.certificate.final_score}%`} />
                  <Info label={t("admin.certs.quizAvg", { defaultValue: "Quiz avg" })} value={detail.quizAverage != null ? `${Math.round(detail.quizAverage)}%` : "—"} />
                  <Info label={t("admin.certs.latestExam", { defaultValue: "Latest exam" })} value={detail.latestExamScore != null ? `${detail.latestExamScore}%` : "—"} />
                  <Info label={t("admin.certs.completion", { defaultValue: "Completion" })} value={`${detail.courseCompletionPct}%`} />
                  <Info label={t("admin.certs.estHours", { defaultValue: "Estimated hours" })} value={String(detail.certificate.hours_estimated)} />
                </div>
                {detail.certificate.status === "revoked" && detail.certificate.revoke_reason && (
                  <p className="mt-3 text-xs text-destructive">{t("admin.certs.revokeReason", { defaultValue: "Reason" })}: {detail.certificate.revoke_reason}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(verifyUrl(detail.certificate.id), "_blank")}><ExternalLink className="mr-1 h-3 w-3" />{t("admin.certs.openVerify", { defaultValue: "Open verify" })}</Button>
                <Button size="sm" variant="outline" onClick={() => copyUrl(detail.certificate.id)}><CopyIcon className="mr-1 h-3 w-3" />{t("admin.certs.copyUrl", { defaultValue: "Copy URL" })}</Button>
                <Button size="sm" variant="outline" disabled title="PDF coming soon"><Download className="mr-1 h-3 w-3" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmReissue(detail.certificate)}><RefreshCw className="mr-1 h-3 w-3" />{t("admin.certs.reissue", { defaultValue: "Reissue" })}</Button>
                {detail.certificate.status === "active" && (
                  <Button size="sm" variant="destructive" onClick={() => setConfirmRevoke(detail.certificate)}><ShieldX className="mr-1 h-3 w-3" />{t("admin.certs.revoke", { defaultValue: "Revoke" })}</Button>
                )}
              </div>

              {detail.auditLogs?.length > 0 && (
                <div className="rounded-2xl border border-border bg-card/40 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Audit log</div>
                  <ul className="mt-2 space-y-1 text-xs">
                    {detail.auditLogs.map((l: { id: string; action: string; created_at: string }) => (
                      <li key={l.id} className="flex justify-between"><span>{l.action}</span><span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Revoke confirm */}
      <AlertDialog open={!!confirmRevoke} onOpenChange={(o) => { if (!o) { setConfirmRevoke(null); setRevokeReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.certs.revoke", { defaultValue: "Revoke certificate" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.certs.revokeConfirm", { defaultValue: "This certificate will be marked as revoked publicly." })}</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder={t("admin.certs.revokeReason", { defaultValue: "Reason" })} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doRevoke} disabled={!revokeReason.trim() || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.certs.revoke", { defaultValue: "Revoke" })}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reissue confirm */}
      <AlertDialog open={!!confirmReissue} onOpenChange={(o) => { if (!o) setConfirmReissue(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.certs.reissue", { defaultValue: "Reissue certificate" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.certs.reissueConfirm", { defaultValue: "A new certificate will be created and the old one revoked." })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doReissue} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.certs.reissue", { defaultValue: "Reissue" })}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminAppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function verifyUrl(id: string) { return `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${id}`; }
