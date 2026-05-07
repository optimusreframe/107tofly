import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun, Plane, LogOut, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [dark, setDark] = useState(false);
  const { user, signOut } = useAuth();
  const { t, i18n } = useTranslation();

  const nav = [
    { to: "/dashboard", label: t("nav.dashboard") },
    { to: "/lessons", label: t("nav.lessons") },
    { to: "/practice", label: t("nav.practice") },
    { to: "/course", label: t("nav.course") },
    { to: "/simulator", label: t("nav.simulator") },
    { to: "/flycoach", label: t("nav.flycoach") },
  ];

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("locale").eq("id", user.id).maybeSingle().then(({ data }) => {
      const loc = (data as { locale?: string } | null)?.locale;
      if (loc && loc !== i18n.language) i18n.changeLanguage(loc);
    });
  }, [user, i18n]);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const toggleLang = async () => {
    const next = i18n.language?.startsWith("es") ? "en" : "es";
    await i18n.changeLanguage(next);
    localStorage.setItem("locale", next);
    if (user) {
      await supabase.from("profiles").update({ locale: next }).eq("id", user.id);
    }
  };

  const lang = (i18n.language || "es").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto mt-3 max-w-6xl px-4">
        <div className="glass-strong flex h-14 items-center justify-between rounded-full px-4 shadow-glass">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--gradient-sky)] text-primary-foreground">
              <Plane className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span>107<span className="text-gradient">toFly</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              aria-label="Toggle language"
              className="grid h-9 min-w-9 place-items-center gap-1 rounded-full border border-border bg-card/60 px-2 text-xs font-medium text-foreground transition hover:bg-accent"
            >
              <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" />{lang}</span>
            </button>
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-foreground transition hover:bg-accent"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user ? (
              <button
                onClick={() => signOut()}
                aria-label="Sign out"
                className="hidden h-9 items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 text-sm text-foreground transition hover:bg-accent sm:inline-flex"
              >
                <LogOut className="h-4 w-4" /> {t("nav.signout")}
              </button>
            ) : (
              <Link
                to="/auth"
                className="hidden rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 sm:inline-flex"
              >
                {t("nav.signin")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
