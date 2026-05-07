import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";

import appCss from "../styles.css?url";
import i18n from "../i18n";
import { installServerFnAuth } from "@/lib/server-fn-auth";

if (typeof window !== "undefined") installServerFnAuth();

const themeScript = `(function(){try{var k='theme';var s=localStorage.getItem(k);var t=s||'system';var sd=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=(t==='dark'||(t==='system'&&sd))?'dark':'light';var d=document.documentElement;d.classList.toggle('dark',r==='dark');d.style.colorScheme=r;d.dataset.theme=r;}catch(e){document.documentElement.style.colorScheme='light';}})();`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "107toFly" },
      { name: "format-detection", content: "telephone=no" },
      { title: "107toFly" },
      { name: "description", content: "107toFly is a premium web app for mastering the FAA Part 107 Remote Pilot Certificate exam." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "107toFly" },
      { property: "og:description", content: "107toFly is a premium web app for mastering the FAA Part 107 Remote Pilot Certificate exam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "107toFly" },
      { name: "twitter:description", content: "107toFly is a premium web app for mastering the FAA Part 107 Remote Pilot Certificate exam." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b9cd26b2-60ab-47ad-8e5d-e464b6030d6e" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b9cd26b2-60ab-47ad-8e5d-e464b6030d6e" },
      { name: "theme-color", content: "#0b0d12" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icons/icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
    scripts: [
      { children: themeScript },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <I18nextProvider i18n={i18n}>
      <Outlet />
    </I18nextProvider>
  );
}
