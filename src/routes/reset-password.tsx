import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { mapAuthError } from "@/lib/auth-errors";
import { Plane, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nueva contraseña — 107toFly" }] }),
  component: ResetPage,
});

function ResetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts a recovery token in the URL hash that the client auto-processes.
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo(t("auth.passwordUpdated"));
      setTimeout(() => navigate({ to: "/dashboard" }), 1200);
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
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("auth.resetTitle")}</h1>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="flex items-center gap-2 rounded-2xl border border-border bg-card/60 px-3 py-2.5 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={6}
                placeholder={t("auth.newPassword")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-success">{info}</p>}
            {!ready && (
              <p className="text-xs text-muted-foreground">
                {t("auth.openFromEmail")}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !ready}
              className="mt-2 w-full rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "..." : t("auth.updatePassword")}
            </button>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
