import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4fa45ae9-b7d0-48c0-a39c-0f8c644c436e/id-preview-0dc447e7--05e582d7-0ad6-4bbc-9030-1b49be8851a2.lovable.app-1777874714638.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4fa45ae9-b7d0-48c0-a39c-0f8c644c436e/id-preview-0dc447e7--05e582d7-0ad6-4bbc-9030-1b49be8851a2.lovable.app-1777874714638.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
  return <Outlet />;
}
