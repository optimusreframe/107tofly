import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useAuth } from "@/hooks/use-auth";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const issue = useServerFn(issueCertificate);
  const [cert, setCert] = useState<CertRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      if (!res.ok) setError(res.reason ?? "No cumples los requisitos aún.");
      else {
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
    // background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, H, "F");
    // border
    doc.setDrawColor(96, 165, 250);
    doc.setLineWidth(2);
    doc.rect(24, 24, W - 48, H - 48);
    doc.setTextColor(226, 232, 240);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("107toFly · Course Completion Certificate", W / 2, 80, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("This certifies that", W / 2, 140, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.text(cert.display_name, W / 2, 200, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("has successfully completed the 107toFly Part 107 Preparation Program,", W / 2, 240, { align: "center" });
    doc.text("aligned with the FAA ACS, Remote Pilot Study Guide and 14 CFR Part 107 / 89.", W / 2, 258, { align: "center" });
    // stats
    const y = 330;
    doc.setFontSize(10); doc.setTextColor(148, 163, 184);
    doc.text("FINAL SCORE", W / 2 - 180, y, { align: "center" });
    doc.text("HOURS", W / 2, y, { align: "center" });
    doc.text("CERTIFICATE ID", W / 2 + 180, y, { align: "center" });
    doc.setFontSize(20); doc.setTextColor(226, 232, 240); doc.setFont("helvetica", "bold");
    doc.text(`${Math.round(cert.final_score)}%`, W / 2 - 180, y + 28, { align: "center" });
    doc.text(`${cert.hours_estimated}h`, W / 2, y + 28, { align: "center" });
    doc.setFontSize(11);
    doc.text(`107F-${cert.id.slice(0, 8).toUpperCase()}`, W / 2 + 180, y + 28, { align: "center" });
    // disclaimer
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    const disc = "This certificate is NOT an FAA Remote Pilot Certificate and does not replace the official FAA UAG knowledge test or the IACRA certification process.";
    doc.text(doc.splitTextToSize(disc, W - 140), W / 2, H - 70, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`Issued ${new Date(cert.issued_at).toLocaleDateString()}`, W / 2, H - 40, { align: "center" });
    const verifyUrl = `${window.location.origin}/verify/${cert.id}`;
    doc.setTextColor(125, 211, 252); doc.setFontSize(8);
    doc.textWithLink(`Verify: ${verifyUrl}`, W / 2, H - 24, { align: "center", url: verifyUrl });
    doc.save(`107toFly-Certificate-${cert.id.slice(0, 8)}.pdf`);
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

        <div className="mt-12 glass-strong overflow-hidden rounded-3xl shadow-elevated">
          <div className="relative bg-[var(--gradient-aurora)] p-10 text-center text-primary-foreground">
            <div aria-hidden className="absolute inset-0 bg-foreground/30" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-background/20 px-3 py-1 text-xs backdrop-blur">
                <Award className="h-3.5 w-3.5" /> 107toFly · Course Completion
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
            </div>
          </div>
          <div className="flex items-start gap-3 border-t border-border bg-card/70 p-5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>{t("student.certificate.disclaimer")}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {cert ? (
            <button onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90">
              <Download className="h-4 w-4" /> {t("student.certificate.downloadPdf")}
            </button>
          ) : (
            <button onClick={onIssue} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40">
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
