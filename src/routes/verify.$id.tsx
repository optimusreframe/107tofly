import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { ShieldCheck, ShieldX, Plane } from "lucide-react";

export const Route = createFileRoute("/verify/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Verificación · ${params.id} — 107toFly` },
      { name: "description", content: "Verifica la autenticidad de un certificado interno emitido por 107toFly." },
    ],
  }),
  component: VerifyPage,
});

type Cert = {
  id: string;
  display_name: string;
  final_score: number;
  modules_completed: number;
  hours_estimated: number;
  issued_at: string;
  status?: string | null;
  revoked_at?: string | null;
  revoke_reason?: string | null;
};

function VerifyPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const [cert, setCert] = useState<Cert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("certificates")
      .select("id,display_name,final_score,modules_completed,hours_estimated,issued_at,status,revoked_at,revoke_reason")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setCert(data as Cert | null);
        setLoading(false);
      });
  }, [id]);

  const isRevoked = cert?.status === "revoked";

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl px-6 pt-16">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--gradient-sky)] text-primary-foreground">
            <Plane className="h-4 w-4" strokeWidth={2.5} />
          </span>
          107<span className="text-gradient">toFly</span>
        </Link>

        <div className="glass-strong mt-8 rounded-3xl p-8 shadow-glass">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("verify.title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">ID: {id}</p>

          {loading ? (
            <p className="mt-6 text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : cert ? (
            <div className="mt-6 space-y-4">
              {isRevoked ? (
                <div className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">
                  <ShieldX className="h-5 w-5" />
                  <span className="text-sm font-medium">{t("verify.revoked", { defaultValue: "Certificate revoked" })}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-success">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-medium">{t("verify.valid")}</span>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Row label={t("verify.holder")} value={cert.display_name} />
                <Row label={t("verify.score")} value={`${cert.final_score}%`} />
                <Row label={t("verify.modules")} value={String(cert.modules_completed)} />
                <Row label={t("verify.issued")} value={new Date(cert.issued_at).toLocaleDateString()} />
              </dl>
              {isRevoked && cert.revoke_reason && (
                <p className="text-xs text-destructive">{t("verify.reason", { defaultValue: "Reason" })}: {cert.revoke_reason}</p>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">{t("verify.note")}</p>
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">
              <ShieldX className="h-5 w-5" />
              <span className="text-sm font-medium">{t("verify.invalid")}</span>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  );
}
