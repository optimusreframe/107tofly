import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Search, X, AlertTriangle, RotateCcw, Save, Loader2 } from "lucide-react";
import { AdminAppShell } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { useDeviceMode } from "@/hooks/use-device-mode";
import {
  getAdminUsers,
  getAdminUserDetail,
  updateUserRoles,
  updateUserMembership,
  resetUserProgress,
} from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — Admin · 107toFly" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

type ListUser = Awaited<ReturnType<typeof getAdminUsers>>["users"][number];
type Detail = Awaited<ReturnType<typeof getAdminUserDetail>>;
type AppRole = "student" | "admin" | "content_manager" | "support";
type Plan = "free" | "pro" | "lifetime" | "team";
type Status = "active" | "trialing" | "past_due" | "canceled";

const ALL_ROLES: AppRole[] = ["student", "admin", "content_manager", "support"];
const PLANS: Plan[] = ["free", "pro", "lifetime", "team"];
const STATUSES: Status[] = ["active", "trialing", "past_due", "canceled"];

function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const { isMobile } = useDeviceMode();

  const fetchList = useServerFn(getAdminUsers);
  const [users, setUsers] = useState<ListUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [planFilter, setPlanFilter] = useState<"all" | Plan>("all");
  const [progressFilter, setProgressFilter] = useState<"all" | "not_started" | "in_progress" | "completed" | "exam_ready">("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const refresh = () => {
    if (!isAdmin) return;
    fetchList()
      .then((r) => setUsers(r.users))
      .catch((e) => setError(e?.message ?? "Error"));
  };

  useEffect(refresh, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const hay = `${u.displayName ?? ""} ${u.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (roleFilter !== "all" && !u.roles.includes(roleFilter)) return false;
      if (planFilter !== "all" && u.membershipPlan !== planFilter) return false;
      if (progressFilter !== "all") {
        const lc = u.lessonsCompleted;
        if (progressFilter === "not_started" && lc !== 0) return false;
        if (progressFilter === "in_progress" && (lc === 0 || lc >= 28)) return false;
        if (progressFilter === "completed" && lc < 28) return false;
        if (progressFilter === "exam_ready" && u.readiness < 80) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, planFilter, progressFilter]);

  if (authLoading || rolesLoading) {
    return (
      <AdminAppShell>
        <div className="p-8 text-sm text-muted-foreground">Loading…</div>
      </AdminAppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AdminAppShell>
        <div className="mx-auto max-w-md p-8 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have permission to manage users.
          </p>
          <Link to="/dashboard" className="mt-6 inline-flex rounded-full bg-foreground px-4 py-2 text-sm text-background">
            Back to dashboard
          </Link>
        </div>
      </AdminAppShell>
    );
  }

  return (
    <AdminAppShell>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage roles, memberships and progress.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="pl-9"
              aria-label="Search users"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as typeof planFilter)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={progressFilter} onValueChange={(v) => setProgressFilter(v as typeof progressFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Progress" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All progress</SelectItem>
                <SelectItem value="not_started">Not started</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed course</SelectItem>
                <SelectItem value="exam_ready">Exam ready</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        {!users ? (
          <div className="p-8 text-sm text-muted-foreground">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
            No users match your filters.
          </div>
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  onClick={() => setSelectedId(u.id)}
                  className="w-full rounded-2xl border border-border/60 bg-card/40 p-4 text-left active:scale-[.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{u.displayName ?? "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.email ?? "—"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-[10px]">{u.membershipPlan}</Badge>
                      <span className="text-[10px] text-muted-foreground">{u.membershipStatus}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {u.roles.map((r) => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
                    <div><div className="font-semibold text-foreground">{u.xp}</div>XP</div>
                    <div><div className="font-semibold text-foreground">{u.lessonsCompleted}</div>Lessons</div>
                    <div><div className="font-semibold text-foreground">{u.certificates}</div>Certs</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Roles</th>
                  <th className="px-4 py-3 text-left font-medium">Plan</th>
                  <th className="px-4 py-3 text-right font-medium">XP</th>
                  <th className="px-4 py-3 text-right font-medium">Streak</th>
                  <th className="px-4 py-3 text-right font-medium">Lessons</th>
                  <th className="px-4 py-3 text-right font-medium">Quizzes</th>
                  <th className="px-4 py-3 text-right font-medium">Sims</th>
                  <th className="px-4 py-3 text-right font-medium">Certs</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className="cursor-pointer border-b border-border/40 transition hover:bg-accent/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.displayName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        {u.roles.map((r) => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px]">{u.membershipPlan}</Badge>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">{u.membershipStatus}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.xp}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.streak}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.lessonsCompleted}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.quizAttempts}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.examSimulations}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.certificates}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <UserDetailDrawer
          userId={selectedId}
          currentAdminId={user?.id ?? null}
          onClose={() => setSelectedId(null)}
          onChanged={refresh}
        />
      )}
    </AdminAppShell>
  );
}

function UserDetailDrawer({
  userId,
  currentAdminId,
  onClose,
  onChanged,
}: {
  userId: string;
  currentAdminId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const fetchDetail = useServerFn(getAdminUserDetail);
  const updateRoles = useServerFn(updateUserRoles);
  const updateMembership = useServerFn(updateUserMembership);
  const resetProgress = useServerFn(resetUserProgress);

  const [detail, setDetail] = useState<Detail | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [plan, setPlan] = useState<Plan>("free");
  const [status, setStatus] = useState<Status>("active");
  const [saving, setSaving] = useState(false);
  const [confirmRoles, setConfirmRoles] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetText, setResetText] = useState("");

  useEffect(() => {
    fetchDetail({ data: { userId } })
      .then((d) => {
        setDetail(d);
        setRoles(d.roles as AppRole[]);
        setPlan(((d.profile as { membership_plan?: Plan })?.membership_plan ?? "free") as Plan);
        setStatus(((d.profile as { membership_status?: Status })?.membership_status ?? "active") as Status);
      })
      .catch((e) => toast.error(e?.message ?? "Error"));
  }, [userId, fetchDetail]);

  const isSelf = currentAdminId === userId;
  const removingOwnAdmin = isSelf && detail?.roles.includes("admin") && !roles.includes("admin");

  const toggleRole = (r: AppRole) => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const saveRoles = async () => {
    if (roles.length === 0) {
      toast.error("User must have at least one role");
      return;
    }
    setSaving(true);
    try {
      await updateRoles({ data: { userId, roles } });
      toast.success("Roles updated");
      setConfirmRoles(false);
      onChanged();
      const d = await fetchDetail({ data: { userId } });
      setDetail(d);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("CANNOT_REMOVE")) {
        toast.error("You cannot remove your own admin role.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveMembership = async () => {
    setSaving(true);
    try {
      await updateMembership({ data: { userId, plan, status } });
      toast.success("Membership updated");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const doReset = async () => {
    setSaving(true);
    try {
      await resetProgress({ data: { userId, confirm: "RESET" } });
      toast.success("Progress reset");
      setConfirmReset(false);
      setResetText("");
      onChanged();
      const d = await fetchDetail({ data: { userId } });
      setDetail(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{detail?.profile?.display_name ?? "User"}</SheetTitle>
        </SheetHeader>

        {!detail ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="mt-6 space-y-6 pb-12">
            {/* Profile */}
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Profile</h3>
              <div className="space-y-1 rounded-xl border border-border/60 bg-card/30 p-3 text-sm">
                <div><span className="text-muted-foreground">Email:</span> {detail.email ?? "—"}</div>
                <div className="break-all"><span className="text-muted-foreground">User ID:</span> {userId}</div>
                <div><span className="text-muted-foreground">Created:</span> {detail.profile?.created_at ? new Date(detail.profile.created_at).toLocaleString() : "—"}</div>
              </div>
            </section>

            {/* Progress */}
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Study progress</h3>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat label="XP" value={detail.progress?.xp ?? 0} />
                <Stat label="Streak" value={detail.progress?.streak ?? 0} />
                <Stat label="Readiness" value={`${detail.progress?.readiness ?? 0}%`} />
                <Stat label="Lessons" value={`${detail.recentLessons.length}/${detail.totalLessons}`} />
                <Stat label="Quizzes" value={detail.quizAttempts.length} />
                <Stat label="Sims" value={detail.examSimulations.length} />
                <Stat label="Certs" value={detail.certificates.length} />
              </div>
            </section>

            {/* Roles */}
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Roles</h3>
              <div className="space-y-2 rounded-xl border border-border/60 bg-card/30 p-3">
                {ALL_ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-3 text-sm">
                    <Checkbox checked={roles.includes(r)} onCheckedChange={() => toggleRole(r)} />
                    <span>{r}</span>
                  </label>
                ))}
                {removingOwnAdmin && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                    You cannot remove your own admin role.
                  </div>
                )}
                <Button
                  size="sm"
                  disabled={saving || removingOwnAdmin || roles.length === 0}
                  onClick={() => setConfirmRoles(true)}
                  className="mt-2"
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save roles
                </Button>
              </div>
            </section>

            {/* Membership */}
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Membership</h3>
              <div className="space-y-2 rounded-xl border border-border/60 bg-card/30 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Payments are not connected yet. Membership changes are manual admin overrides.
                </p>
                <Button size="sm" disabled={saving} onClick={saveMembership}>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save membership
                </Button>
              </div>
            </section>

            {/* Certificates */}
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Certificates</h3>
              {detail.certificates.length === 0 ? (
                <p className="text-xs text-muted-foreground">No certificates issued.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {detail.certificates.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <div>
                        <div className="text-xs">{new Date(c.issued_at).toLocaleDateString()} · score {c.final_score}</div>
                        <Link to="/verify/$id" params={{ id: c.id }} className="text-xs text-muted-foreground underline">
                          /verify/{c.id.slice(0, 8)}…
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent activity */}
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent activity</h3>
              {detail.recentLessons.length + detail.quizAttempts.length + detail.examSimulations.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {detail.recentLessons.slice(0, 5).map((l, i) => (
                    <li key={`l${i}`} className="flex justify-between border-b border-border/40 py-1">
                      <span>📖 {l.lesson_slug}</span>
                      <span className="text-muted-foreground">{new Date(l.completed_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                  {detail.quizAttempts.slice(0, 5).map((a) => (
                    <li key={a.id} className="flex justify-between border-b border-border/40 py-1">
                      <span>🧠 quiz · {a.score}</span>
                      <span className="text-muted-foreground">{a.finished_at ? new Date(a.finished_at).toLocaleDateString() : "—"}</span>
                    </li>
                  ))}
                  {detail.examSimulations.slice(0, 5).map((s) => (
                    <li key={s.id} className="flex justify-between border-b border-border/40 py-1">
                      <span>🎯 sim · {s.score}</span>
                      <span className="text-muted-foreground">{s.finished_at ? new Date(s.finished_at).toLocaleDateString() : "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Audit logs */}
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Audit log</h3>
              {detail.auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No admin actions recorded.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {detail.auditLogs.map((a) => (
                    <li key={a.id} className="flex justify-between border-b border-border/40 py-1">
                      <span className="font-mono">{a.action}</span>
                      <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Danger zone */}
            <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-destructive">Danger zone</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Soft reset deletes lesson completions, quiz attempts, exam simulations and flashcards, and zeroes XP/streak. Certificates and the account are preserved.
              </p>
              <Button size="sm" variant="destructive" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset student progress
              </Button>
            </section>
          </div>
        )}

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </SheetContent>

      <AlertDialog open={confirmRoles} onOpenChange={setConfirmRoles}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save role changes?</AlertDialogTitle>
            <AlertDialogDescription>
              New roles: {roles.join(", ")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveRoles} disabled={saving}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={(o) => { setConfirmReset(o); if (!o) setResetText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset student progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This is a soft reset. Type <span className="font-mono font-semibold">RESET</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="RESET" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doReset} disabled={resetText !== "RESET" || saving}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
