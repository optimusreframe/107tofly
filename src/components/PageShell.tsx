import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Aurora background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-[var(--gradient-aurora)] opacity-30 blur-3xl animate-aurora" />
        <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-[var(--gradient-sky)] opacity-25 blur-3xl animate-aurora" style={{ animationDelay: "-4s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,var(--background)_0%,transparent),var(--background)_70%)]" />
      </div>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">{children}</main>
      <SiteFooter />
    </div>
  );
}
