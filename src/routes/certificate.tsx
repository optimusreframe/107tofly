import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useAuth } from "@/hooks/use-auth";
import { usePublicRuntime } from "@/hooks/use-public-runtime";
import { supabase } from "@/integrations/supabase/client";
import { issueCertificate } from "@/server/study.functions";
import { Award, ShieldCheck, FileCheck2, AlertTriangle, Download } from "lucide-react";

export const Route = createFileRoute("/certificate")({
  head: () => ({
    meta: [
      { title: "Certificado interno — 107toFly" },
      { name: "description", content: "El 107toFly Course Completion Certificate certifica dominio interno del temario Part 107." },
    ],
  }),
  component: Certificate,
});

// reqs are i18n keys, resolved at render time
const REQ_KEYS = ["modules", "quizAvg", "sim", "coverage"] as const;

interface CertRow { id: string; display_name: string; final_score: number; modules_completed: number; hours_estimated: number; issued_at: string }

function Certificate() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const runtime = usePublicRuntime();
  const issue = useServerFn(issueCertificate);
  const [cert, setCert] = useState<CertRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isEs = i18n.language?.startsWith("es");
  const certCfg = (runtime?.certificate ?? {}) as Record<string, unknown>;
  const featCfg = (runtime?.features ?? {}) as Record<string, unknown>;
  const disclaimerEn = String(certCfg["certificate.disclaimer_en"] ?? t("student.certificate.disclaimer"));
  const disclaimerEs = String(certCfg["certificate.disclaimer_es"] ?? t("student.certificate.disclaimer"));
  const disclaimer = isEs ? disclaimerEs : disclaimerEn;
  const templateStyle = String(certCfg["certificate.template_style"] ?? "premium");
  const certificatesEnabled = featCfg["features.certificates_enabled"] !== false;

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("certificates").select("*").eq("user_id", user.id).order("issued_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (data) setCert(data as CertRow); });
  }, [user]);

  const onIssue = async () => {
    setBusy(true); setError(null);
    try {
      const res = await issue();
      if (!res.ok) {
        const code = res.reason ?? "";
        if (code === "CERTIFICATES_DISABLED") setError(t("runtime.certificatesDisabled"));
        else if (code === "REQUIREMENTS_NOT_MET") setError(t("student.certificate.defaultReason"));
        else setError(code || t("student.certificate.defaultReason"));
      } else {
        const { data } = await supabase.from("certificates").select("*").eq("id", res.id).maybeSingle();
        if (data) setCert(data as CertRow);
      }
    } finally { setBusy(false); }
  };

  const downloadPdf = async () => {
    if (!cert) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Style presets — minimal differences in palette/border/title
    const style = templateStyle;
    const palette = style === "minimal"
      ? { bg: [255, 255, 255] as [number, number, number], fg: [17, 24, 39] as [number, number, number], muted: [107, 114, 128] as [number, number, number], border: [17, 24, 39] as [number, number, number], link: [37, 99, 235] as [number, number, number] }
      : style === "classic"
        ? { bg: [250, 245, 230] as [number, number, number], fg: [60, 40, 20] as [number, number, number], muted: [120, 100, 80] as [number, number, number], border: [160, 120, 60] as [number, number, number], link: [120, 80, 30] as [number, number, number] }
        : { bg: [15, 23, 42] as [number, number, number], fg: [226, 232, 240] as [number, number, number], muted: [148, 163, 184] as [number, number, number], border: [96, 165, 250] as [number, number, number], link: [125, 211, 252] as [number, number, number] };
    const titleText = style === "classic"
      ? t("student.certificate.pdfTitleClassic")
      : style === "minimal"
        ? t("student.certificate.pdfTitleMinimal")
        : t("student.certificate.pdfTitlePremium");

    doc.setFillColor(...palette.bg);
    doc.rect(0, 0, W, H, "F");
    doc.setDrawColor(...palette.border);
    doc.setLineWidth(style === "classic" ? 3 : 2);
    doc.rect(24, 24, W - 48, H - 48);
    if (style === "classic") doc.rect(34, 34, W - 68, H - 68);
    doc.setTextColor(...palette.fg);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(titleText, W / 2, 80, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(t("student.certificate.thisCertifies"), W / 2, 140, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.text(cert.display_name, W / 2, 200, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(t("student.certificate.pdfBody1"), W / 2, 240, { align: "center" });
    doc.text(t("student.certificate.pdfBody2"), W / 2, 258, { align: "center" });
    const y = 330;
    doc.setFontSize(10); doc.setTextColor(...palette.muted);
    doc.text(t("student.certificate.finalScoreUpper"), W / 2 - 180, y, { align: "center" });
    doc.text(t("student.certificate.hoursUpper"), W / 2, y, { align: "center" });
    doc.text(t("student.certificate.certIdUpper"), W / 2 + 180, y, { align: "center" });
    doc.setFontSize(20); doc.setTextColor(...palette.fg); doc.setFont("helvetica", "bold");
    doc.text(`${Math.round(cert.final_score)}%`, W / 2 - 180, y + 28, { align: "center" });
    doc.text(`${cert.hours_estimated}h`, W / 2, y + 28, { align: "center" });
    doc.setFontSize(11);
    doc.text(`107F-${cert.id.slice(0, 8).toUpperCase()}`, W / 2 + 180, y + 28, { align: "center" });
    // disclaimer (runtime)
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...palette.muted);
    doc.text(doc.splitTextToSize(disclaimer, W - 140), W / 2, H - 70, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(t("student.certificate.issuedOn", { date: new Date(cert.issued_at).toLocaleDateString(isEs ? "es-ES" : "en-US") }), W / 2, H - 40, { align: "center" });
    const verifyUrl = `${window.location.origin}/verify/${cert.id}`;
    doc.setTextColor(...palette.link); doc.setFontSize(8);
    doc.textWithLink(t("student.certificate.verifyLabel", { url: verifyUrl }), W / 2, H - 24, { align: "center", url: verifyUrl });
    doc.save(`107toFly-Certificate-${cert.id.slice(0, 8)}-${style}.pdf`);
  };

  if (loading || !user) return <StudentAppShell><div className="mx-auto max-w-3xl px-6 pt-24 text-muted-foreground">{t("common.loading")}</div></StudentAppShell>;

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">{t("student.certificate.eyebrow")}</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-6xl">
          <span className="text-gradient">{t("student.certificate.heroTitle")}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("student.certificate.heroDesc")}
        </p>

        <div className={`mt-12 overflow-hidden rounded-3xl shadow-elevated ${templateStyle === "minimal" ? "border-2 border-foreground bg-background" : templateStyle === "classic" ? "border-4 border-amber-700/60 bg-amber-50" : "glass-strong"}`}>
          <div className={`relative p-10 text-center ${templateStyle === "minimal" ? "bg-background text-foreground" : templateStyle === "classic" ? "bg-amber-50 text-amber-950" : "bg-[var(--gradient-aurora)] text-primary-foreground"}`}>
            {templateStyle === "premium" && <div aria-hidden className="absolute inset-0 bg-foreground/30" />}
            <div className="relative">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${templateStyle === "premium" ? "bg-background/20 backdrop-blur" : "border border-current/30"}`}>
                <Award className="h-3.5 w-3.5" /> {t("student.certificate.courseCompletionBadge")}
              </div>
              <div className="mt-6 font-display text-sm uppercase tracking-[0.3em] opacity-80">{t("student.certificate.thisCertifies")}</div>
              <div className="mt-3 font-display text-4xl font-semibold md:text-5xl">{cert?.display_name ?? t("student.certificate.yourName")}</div>
              <div className="mt-3 max-w-xl mx-auto text-sm opacity-90">
                {t("student.certificate.programLine")}
              </div>
              <div className="mt-8 grid grid-cols-3 gap-6 text-xs">
                <div><div className="opacity-70">{t("student.certificate.finalScore")}</div><div className="font-display text-lg">{cert ? `${Math.round(cert.final_score)}%` : "—"}</div></div>
                <div><div className="opacity-70">{t("student.certificate.hours")}</div><div className="font-display text-lg">{cert?.hours_estimated ?? 56}h</div></div>
                <div><div className="opacity-70">{t("student.certificate.certId")}</div><div className="font-mono text-xs">{cert ? `107F-${cert.id.slice(0, 8).toUpperCase()}` : "—"}</div></div>
              </div>
              <div className="mt-4 text-[10px] uppercase tracking-wider opacity-60">{t("student.certificate.style", { defaultValue: "Style" })}: {templateStyle}</div>
            </div>
          </div>
          <div className="flex items-start gap-3 border-t border-border bg-card/70 p-5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>{disclaimer}</p>
          </div>
        </div>

        {!certificatesEnabled && (
          <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700">
            {t("runtime.certificatesDisabled")}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {cert ? (
            <button onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90">
              <Download className="h-4 w-4" /> {t("student.certificate.downloadPdf")}
            </button>
          ) : (
            <button onClick={onIssue} disabled={busy || !certificatesEnabled} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40">
              <Award className="h-4 w-4" /> {busy ? t("student.certificate.issuing") : t("student.certificate.issueCert")}
            </button>
          )}
        </div>
        {error && <div className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 font-display text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-success" /> {t("student.certificate.reqsTitle")}
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {REQ_KEYS.map((k) => (
                <li key={k} className="flex gap-2"><FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t(`student.certificate.reqs.${k}`)}</li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 font-display text-lg font-semibold">
              <Award className="h-5 w-5 text-primary" /> {t("student.certificate.includesTitle")}
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• {t("student.certificate.includes.pdf")}</li>
              <li>• {t("student.certificate.includes.uniqueId")}</li>
              <li>• {t("student.certificate.includes.linkedin")}</li>
              <li>• {t("student.certificate.includes.profile")}</li>
              <li>• {t("student.certificate.includes.disclaimer")}</li>
            </ul>
          </div>
        </div>
      </section>
    </StudentAppShell>
  );
}
