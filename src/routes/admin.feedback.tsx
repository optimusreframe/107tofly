import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminAppShell } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listExerciseFeedback, dismissFeedback } from "@/lib/admin-feedback.functions";

export const Route = createFileRoute("/admin/feedback")({
  head: () => ({ meta: [{ title: "Feedback Inbox — Admin · 107toFly" }, { name: "robots", content: "noindex" }] }),
  component: AdminFeedbackPage,
});

type Item = Awaited<ReturnType<typeof listExerciseFeedback>>["items"][number];

function AdminFeedbackPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const listFn = useServerFn(listExerciseFeedback);
  const dismissFn = useServerFn(dismissFeedback);
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  const refresh = () => {
    setBusy(true);
    listFn().then((r) => setItems(r.items)).catch((e) => toast.error(e?.message ?? "Error")).finally(() => setBusy(false));
  };
  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]); // eslint-disable-line

  if (authLoading || rolesLoading) return <AdminAppShell><div className="p-8 text-sm text-muted-foreground">Loading…</div></AdminAppShell>;
  if (!isAdmin) return <AdminAppShell><div className="p-8 text-center"><Shield className="mx-auto h-8 w-8" /><p className="mt-4">Access denied</p></div></AdminAppShell>;

  return (
    <AdminAppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Exercise Feedback</h1>
            <p className="text-sm text-muted-foreground">Reports submitted by students from the Session Player.</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </header>

        {!items ? (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">No feedback yet.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => {
              const p = (it.exercise?.payload ?? {}) as { prompt?: string; question?: string };
              const prompt = p.prompt ?? p.question ?? "(no prompt)";
              return (
                <li key={it.id} className="rounded-2xl border border-border/60 bg-card/40 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(it.createdAt).toLocaleString()}</span>
                    {it.unit && <Badge variant="outline">{it.unit.slug} · {it.unit.locale}</Badge>}
                    {it.concept && <Badge variant="secondary">{it.concept.title}</Badge>}
                    {it.exercise && <Badge variant="outline">{it.exercise.kind}</Badge>}
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={async () => {
                      if (!confirm("Dismiss this feedback?")) return;
                      try { await dismissFn({ data: { id: it.id } }); refresh(); }
                      catch (e: any) { toast.error(e?.message ?? "Error"); }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 text-sm font-medium">{prompt}</div>
                  {it.note && <div className="mt-2 rounded-md border border-border/50 bg-background/40 p-2 text-sm">{it.note}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminAppShell>
  );
}
