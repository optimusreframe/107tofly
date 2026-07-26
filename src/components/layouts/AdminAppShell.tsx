import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ListChecks,
  Award,
  Image as ImageIcon,
  BarChart3,
  Settings,
  Globe,
  Shield,
  ArrowLeft,
  GraduationCap,
  MessageSquareWarning,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDeviceMode } from "@/hooks/use-device-mode";

export const ADMIN_NAV = [
  { to: "/admin", labelKey: "admin.nav.overview", icon: LayoutDashboard, ready: true },
  { to: "/admin/users", labelKey: "admin.nav.users", icon: Users, ready: true },
  { to: "/admin/lessons", labelKey: "admin.nav.lessons", icon: BookOpen, ready: true },
  { to: "/admin/learning", labelKey: "admin.nav.learning", icon: GraduationCap, ready: true },
  { to: "/admin/questions", labelKey: "admin.nav.questions", icon: ListChecks, ready: true },
  { to: "/admin/certificates", labelKey: "admin.nav.certificates", icon: Award, ready: true },
  { to: "/admin/landing", labelKey: "admin.nav.landing", icon: Globe, ready: true },
  { to: "/admin/media", labelKey: "admin.nav.media", icon: ImageIcon, ready: true },
  { to: "/admin/analytics", labelKey: "admin.nav.analytics", icon: BarChart3, ready: true },
  { to: "/admin/settings", labelKey: "admin.nav.settings", icon: Settings, ready: true },
] as const;

export function AdminAppShell({ children }: { children: ReactNode }) {
  const { isMobile } = useDeviceMode();
  const { t } = useTranslation();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background">
        {t("nav.skip", { defaultValue: "Saltar al contenido" })}
      </a>
      <div className="flex">
        {!isMobile && (
          <aside aria-label="Admin navigation" className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border/40 bg-card/30 backdrop-blur-xl md:flex md:flex-col">
            <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background">
                <Shield className="h-4 w-4" />
              </span>
              <span>Admin</span>
            </div>
            <nav className="flex-1 space-y-0.5 px-3 py-2">
              {ADMIN_NAV.map((item) => {
                const active = item.to === "/admin" ? path === "/admin" : path === item.to || path.startsWith(item.to + "/");
                const Icon = item.icon;
                const cls = `relative flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  active ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                } ${!item.ready ? "opacity-60 pointer-events-none" : ""}`;
                return (
                  <Link key={item.to} to={item.to} aria-disabled={!item.ready} aria-current={active ? "page" : undefined} className={cls}>
                    {active && <span aria-hidden className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />}
                    <span className="flex items-center gap-3"><Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />{t(item.labelKey)}</span>
                    {!item.ready && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide">soon</span>}
                  </Link>
                );
              })}
            </nav>
            <Link to="/dashboard" className="m-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> {t("admin.nav.backToApp")}
            </Link>
          </aside>
        )}

        <div className="flex min-h-screen flex-1 flex-col min-w-0">
          <header
            className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border/40 bg-background/70 px-4 backdrop-blur-xl"
            style={isMobile ? { paddingTop: "env(safe-area-inset-top)", height: "calc(3.5rem + env(safe-area-inset-top))" } : undefined}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4" />
              <span>{t("admin.nav.console")}</span>
            </div>
            {isMobile && (
              <Link to="/dashboard" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                {t("admin.nav.backToAppShort")}
              </Link>
            )}
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 focus:outline-none min-w-0"
            style={isMobile ? { paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" } : undefined}
          >
            {children}
          </main>
          {isMobile && (
            <nav
              aria-label={t("admin.nav.sections")}
              className="fixed inset-x-0 bottom-0 z-40 overflow-x-auto border-t border-border/40 bg-background/90 backdrop-blur-xl"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <ul className="flex min-w-max gap-1 px-3 py-2">
                {ADMIN_NAV.map((item) => {
                  const active = item.to === "/admin" ? path === "/admin" : path === item.to || path.startsWith(item.to + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-disabled={!item.ready}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition active:scale-95 ${
                          active ? "border-foreground/20 bg-accent text-foreground shadow-sm" : "border-transparent text-muted-foreground hover:bg-accent/60"
                        } ${!item.ready ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {t(item.labelKey)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
