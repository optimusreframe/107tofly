import { createFileRoute, Navigate } from "@tanstack/react-router";

// Legacy route: redirected to canonical /lessons listing.
export const Route = createFileRoute("/lesson")({
  head: () => ({
    meta: [
      { title: "Lecciones — 107toFly" },
      { name: "description", content: "Plan de 28 días Part 107." },
    ],
  }),
  component: () => <Navigate to="/lessons" replace />,
});
