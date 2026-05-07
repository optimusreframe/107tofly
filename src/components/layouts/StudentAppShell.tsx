import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Brain,
  Plane,
  Sparkles,
  Trophy,
  Award,
  Target,
  Menu,
  LogOut,
  Sun,
  Moon,
  Languages,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeviceMode } from "@/hooks/use-device-mode";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/SiteFooter";

const PRIMARY = [
  { to: "/dashboard", icon: LayoutDashboard, key: "nav.dashboard" },
  { to: "/lessons", icon: BookOpen, key: "nav.lessons" },
  { to: "/course", icon: GraduationCap, key: "nav.course" },
  { to: "/practice", icon: Target, key: "nav.practice" },
  { to: "/simulator", icon: Plane, key: "nav.simulator" },
  { to: "/flashcards", icon: Brain, key: "nav.flashcards" },
  { to: "/flycoach", icon: Sparkles, key: "nav.flycoach" },
  { to: "/achievements", icon: Trophy, key: "nav.achievements" },
  { to: "/certificate", icon: Award, key: "nav.certificate" },
  { to: "/settings", icon: Settings, key: "nav.settings" },
] as const;

const MOBILE_TABS = [
  { to: "/dashboard", icon: LayoutDashboard, key: "nav.dashboard" },
  { to: "/lessons", icon: BookOpen, key: "nav.lessons" },
  { to: "/practice", icon: Target, key: "nav.practice" },
  { to: "/flycoach", icon: Sparkles, key: "nav.flycoach" },
] as const;

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

export function StudentAppShell({ children }: { children: ReactNode }) {
  const { mode, isMobile } = useDeviceMode();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleLang = async () => {
    const next = i18n.language?.startsWith("es") ? "en" : "es";
    await i18n.changeLanguage(next);
    localStorage.setItem("locale", next);
    if (user) await supabase.from("profiles").update({ locale: next }).eq("id", user.id);
  };
  const lang = (i18n.language || "es").slice(0, 2).toUpperCase();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-[var(--gradient-aurora)] opacity-20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-[var(--gradient-sky)] opacity-15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,var(--background)_0%,transparent),var(--background)_70%)]" />
      </div>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background"
      >
        {t("nav.skip", { defaultValue: "Saltar al contenido" })}
      </a>

      {mode === "desktop" ? (
        <div className="flex">
          <aside
            aria-label="Student navigation"
            className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border/40 bg-card/40 backdrop-blur-xl lg:flex lg:flex-col"
          >
            <Link to="/" className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--gradient-sky)] text-primary-foreground">
                <Plane className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <span>107<span className="text-gradient">toFly</span></span>
            </Link>
            <nav className="flex-1 space-y-0.5 px-3 py-2">
              {PRIMARY.map((item) => {
                const active = path === item.to || path.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                      active
                        ? "bg-accent text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    {active && <span aria-hidden className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />}
                    <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                    <span>{t(item.key)}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border/40 p-3 text-xs text-muted-foreground">
              {user?.email}
            </div>
          </aside>

          <div className="flex min-h-screen flex-1 flex-col min-w-0">
            <header className="sticky top-0 z-40 flex h-14 items-center justify-end gap-2 border-b border-border/40 bg-background/60 px-4 backdrop-blur-xl">
              <button onClick={toggleLang} aria-label="Toggle language" className="grid h-9 place-items-center gap-1 rounded-full border border-border bg-card/60 px-3 text-xs font-medium hover:bg-accent transition">
                <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" />{lang}</span>
              </button>
              <button onClick={toggle} aria-label="Toggle theme" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 hover:bg-accent transition">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {user && (
                <button onClick={() => signOut()} aria-label="Sign out" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 text-sm hover:bg-accent transition">
                  <LogOut className="h-4 w-4" /> {t("nav.signout")}
                </button>
              )}
            </header>
            <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none min-w-0">
              {children}
            </main>
            <SiteFooter />
          </div>
        </div>
      ) : (
        <>
          <header
            className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border/40 bg-background/70 px-4 backdrop-blur-xl"
            style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(3.5rem + env(safe-area-inset-top))" }}
          >
            <Link to="/" className="flex items-center gap-2 font-display font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--gradient-sky)] text-primary-foreground">
                <Plane className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span>107<span className="text-gradient">toFly</span></span>
            </Link>
            <div className="flex items-center gap-2">
              <button onClick={toggleLang} aria-label="Toggle language" className="grid h-10 min-w-10 place-items-center rounded-full border border-border bg-card/60 px-2 text-xs hover:bg-accent active:scale-95 transition">
                <Languages className="h-3.5 w-3.5" />
              </button>
              <button onClick={toggle} aria-label="Toggle theme" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/60 hover:bg-accent active:scale-95 transition">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button onClick={() => setMenuOpen((s) => !s)} aria-label="Open menu" aria-expanded={menuOpen} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/60 hover:bg-accent active:scale-95 transition">
                <Menu className="h-4 w-4" />
              </button>
            </div>
          </header>

          {menuOpen && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md" onClick={() => setMenuOpen(false)}>
              <nav
                aria-label="More navigation"
                className="absolute right-3 top-16 w-64 rounded-2xl border border-border bg-card p-2 shadow-xl"
                style={{ top: "calc(4rem + env(safe-area-inset-top))" }}
                onClick={(e) => e.stopPropagation()}
              >
                {PRIMARY.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-accent active:bg-accent/80">
                      <Icon className="h-4 w-4" /> {t(item.key)}
                    </Link>
                  );
                })}
                {user && (
                  <button onClick={() => { setMenuOpen(false); signOut(); }} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-accent">
                    <LogOut className="h-4 w-4" /> {t("nav.signout")}
                  </button>
                )}
              </nav>
            </div>
          )}

          <main
            id="main-content"
            tabIndex={-1}
            className="focus:outline-none"
            style={{ paddingBottom: isMobile ? "calc(5rem + env(safe-area-inset-bottom))" : undefined }}
          >
            {children}
          </main>

          {isMobile && (
            <nav
              aria-label="Primary"
              className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-background/90 backdrop-blur-xl"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <ul className="mx-auto grid max-w-md grid-cols-5">
                {MOBILE_TABS.map((item) => {
                  const active = path === item.to || path.startsWith(item.to + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-[10px] font-medium transition active:scale-95 ${
                          active ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
                        <span className="truncate">{t(item.key)}</span>
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <button
                    onClick={() => setMenuOpen(true)}
                    aria-label="More"
                    className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-2 py-2 text-[10px] font-medium text-muted-foreground active:scale-95"
                  >
                    <Menu className="h-5 w-5" />
                    <span>{t("nav.more", { defaultValue: "Más" })}</span>
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
