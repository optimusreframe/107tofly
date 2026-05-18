import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { mapAuthError } from "@/lib/auth-errors";
import { Plane, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar contraseña — 107toFly" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setInfo(t("auth.resetSent"));
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <section className="mx-auto flex max-w-md flex-col items-center px-6 pt-16">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--gradient-sky)] text-primary-foreground">
            <Plane className="h-4 w-4" strokeWidth={2.5} />
          </span>
          107<span className="text-gradient">toFly</span>
        </Link>
        <div className="glass-strong mt-8 w-full rounded-3xl p-8 shadow-glass">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("auth.forgotTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.forgotSubtitle")}</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="flex items-center gap-2 rounded-2xl border border-border bg-card/60 px-3 py-2.5 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-success">{info}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "..." : t("auth.sendReset")}
            </button>
          </form>
          <Link to="/auth" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground">
            {t("auth.backToLogin")}
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
