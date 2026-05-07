import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AppRole = "student" | "admin" | "content_manager" | "support";
const ALL_ROLES: AppRole[] = ["student", "admin", "content_manager", "support"];

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isAdmin = (data ?? []).some((r) => r.role === "admin");
  if (!isAdmin) throw new Error("FORBIDDEN");
}

async function logAudit(
  adminUserId: string,
  targetUserId: string | null,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  await supabaseAdmin.from("admin_audit_logs").insert({
    admin_user_id: adminUserId,
    target_user_id: targetUserId,
    action,
    metadata: metadata as never,
  });
}

export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const tables = [
      "profiles",
      "lessons",
      "questions",
      "quiz_attempts",
      "exam_simulations",
      "certificates",
    ] as const;
    const counts: Record<string, number> = {};
    await Promise.all(
      tables.map(async (t) => {
        const { count } = await supabaseAdmin
          .from(t)
          .select("*", { count: "exact", head: true });
        counts[t] = count ?? 0;
      }),
    );
    return {
      users: counts.profiles,
      lessons: counts.lessons,
      questions: counts.questions,
      quizAttempts: counts.quiz_attempts,
      examSimulations: counts.exam_simulations,
      certificates: counts.certificates,
    };
  });

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [profilesRes, rolesRes, progressRes, lcRes, qaRes, esRes, certRes, authRes] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, display_name, locale, membership_plan, membership_status, created_at, updated_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("progress").select("user_id, xp, streak, readiness, updated_at"),
        supabaseAdmin.from("lesson_completions").select("user_id"),
        supabaseAdmin.from("quiz_attempts").select("user_id, score, finished_at"),
        supabaseAdmin.from("exam_simulations").select("user_id, score, finished_at"),
        supabaseAdmin.from("certificates").select("user_id"),
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      ]);

    const emailMap = new Map<string, string>();
    for (const u of authRes.data?.users ?? []) {
      if (u.id && u.email) emailMap.set(u.id, u.email);
    }

    const rolesByUser = new Map<string, AppRole[]>();
    for (const r of rolesRes.data ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      rolesByUser.set(r.user_id, arr);
    }

    const progressByUser = new Map<string, { xp: number; streak: number; readiness: number; updated_at: string }>();
    for (const p of progressRes.data ?? []) {
      progressByUser.set(p.user_id, {
        xp: p.xp ?? 0,
        streak: p.streak ?? 0,
        readiness: p.readiness ?? 0,
        updated_at: p.updated_at,
      });
    }

    const lessonsByUser = new Map<string, number>();
    for (const l of lcRes.data ?? []) lessonsByUser.set(l.user_id, (lessonsByUser.get(l.user_id) ?? 0) + 1);

    const attemptsByUser = new Map<string, { count: number; lastAt: string | null }>();
    for (const a of qaRes.data ?? []) {
      const cur = attemptsByUser.get(a.user_id) ?? { count: 0, lastAt: null };
      cur.count += 1;
      if (a.finished_at && (!cur.lastAt || a.finished_at > cur.lastAt)) cur.lastAt = a.finished_at;
      attemptsByUser.set(a.user_id, cur);
    }

    const simsByUser = new Map<string, { count: number; lastAt: string | null }>();
    for (const s of esRes.data ?? []) {
      const cur = simsByUser.get(s.user_id) ?? { count: 0, lastAt: null };
      cur.count += 1;
      if (s.finished_at && (!cur.lastAt || s.finished_at > cur.lastAt)) cur.lastAt = s.finished_at;
      simsByUser.set(s.user_id, cur);
    }

    const certsByUser = new Map<string, number>();
    for (const c of certRes.data ?? []) certsByUser.set(c.user_id, (certsByUser.get(c.user_id) ?? 0) + 1);

    const users = (profilesRes.data ?? []).map((p) => {
      const prog = progressByUser.get(p.id);
      const att = attemptsByUser.get(p.id);
      const sim = simsByUser.get(p.id);
      const lastActivity = [prog?.updated_at, att?.lastAt, sim?.lastAt]
        .filter(Boolean)
        .sort()
        .pop() ?? null;
      return {
        id: p.id,
        email: emailMap.get(p.id) ?? null,
        displayName: p.display_name,
        roles: rolesByUser.get(p.id) ?? [],
        membershipPlan: p.membership_plan ?? "free",
        membershipStatus: p.membership_status ?? "active",
        xp: prog?.xp ?? 0,
        streak: prog?.streak ?? 0,
        readiness: prog?.readiness ?? 0,
        lessonsCompleted: lessonsByUser.get(p.id) ?? 0,
        quizAttempts: att?.count ?? 0,
        examSimulations: sim?.count ?? 0,
        certificates: certsByUser.get(p.id) ?? 0,
        createdAt: p.created_at,
        lastActivity,
      };
    });

    return { users };
  });

export const getAdminUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { userId } = data;

    const [profile, roles, progress, lessons, attempts, sims, certs, audit, authUser] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
        supabaseAdmin.from("progress").select("*").eq("user_id", userId).maybeSingle(),
        supabaseAdmin
          .from("lesson_completions")
          .select("lesson_slug, topic, completed_at")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("quiz_attempts")
          .select("id, mode, topic, score, correct, total, started_at, finished_at")
          .eq("user_id", userId)
          .order("started_at", { ascending: false })
          .limit(10),
        supabaseAdmin
          .from("exam_simulations")
          .select("id, score, correct, total, started_at, finished_at, duration_sec")
          .eq("user_id", userId)
          .order("started_at", { ascending: false })
          .limit(10),
        supabaseAdmin
          .from("certificates")
          .select("id, display_name, final_score, modules_completed, issued_at")
          .eq("user_id", userId)
          .order("issued_at", { ascending: false }),
        supabaseAdmin
          .from("admin_audit_logs")
          .select("id, action, metadata, admin_user_id, created_at")
          .eq("target_user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabaseAdmin.auth.admin.getUserById(userId),
      ]);

    const totalLessons = await supabaseAdmin
      .from("lessons")
      .select("*", { count: "exact", head: true });

    return {
      profile: profile.data,
      email: authUser.data?.user?.email ?? null,
      roles: ((roles.data ?? []) as { role: AppRole }[]).map((r) => r.role),
      progress: progress.data,
      recentLessons: lessons.data ?? [],
      quizAttempts: attempts.data ?? [],
      examSimulations: sims.data ?? [],
      certificates: certs.data ?? [],
      auditLogs: audit.data ?? [],
      totalLessons: totalLessons.count ?? 0,
    };
  });

export const updateUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        roles: z.array(z.enum(["student", "admin", "content_manager", "support"])).min(1),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { userId, roles } = data;
    const next = Array.from(new Set(roles)) as AppRole[];

    // Prevent self-removal of last admin
    if (userId === context.userId && !next.includes("admin")) {
      const { data: admins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminIds = new Set((admins ?? []).map((a) => a.user_id));
      if (adminIds.size <= 1 && adminIds.has(userId)) {
        throw new Error("CANNOT_REMOVE_LAST_ADMIN");
      }
      throw new Error("CANNOT_REMOVE_OWN_ADMIN");
    }

    const { data: current } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const currentRoles = new Set(((current ?? []) as { role: AppRole }[]).map((r) => r.role));
    const toAdd = next.filter((r) => !currentRoles.has(r));
    const toRemove = ALL_ROLES.filter((r) => currentRoles.has(r) && !next.includes(r));

    if (toAdd.length) {
      await supabaseAdmin
        .from("user_roles")
        .insert(toAdd.map((role) => ({ user_id: userId, role })));
    }
    if (toRemove.length) {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .in("role", toRemove);
    }

    await logAudit(context.userId, userId, "role_update", { roles: next });
    return { ok: true, roles: next };
  });

export const updateUserMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        plan: z.enum(["free", "pro", "lifetime", "team"]),
        status: z.enum(["active", "trialing", "past_due", "canceled"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ membership_plan: data.plan, membership_status: data.status })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, data.userId, "membership_update", {
      plan: data.plan,
      status: data.status,
    });
    return { ok: true };
  });

export const resetUserProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), confirm: z.literal("RESET") }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { userId } = data;
    // Soft reset: clear completions, attempts, simulations, flashcards. Keep certificates and auth.
    await Promise.all([
      supabaseAdmin.from("lesson_completions").delete().eq("user_id", userId),
      supabaseAdmin.from("quiz_answers").delete().eq("user_id", userId),
      supabaseAdmin.from("quiz_attempts").delete().eq("user_id", userId),
      supabaseAdmin.from("exam_simulations").delete().eq("user_id", userId),
      supabaseAdmin.from("flashcards").delete().eq("user_id", userId),
    ]);
    await supabaseAdmin
      .from("progress")
      .update({ study_pct: 0, practice_pct: 0, review_pct: 0, readiness: 0, xp: 0, streak: 0 })
      .eq("user_id", userId);
    await logAudit(context.userId, userId, "progress_reset", { kind: "soft" });
    return { ok: true };
  });

export const getAdminUserActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const [lc, qa, es] = await Promise.all([
      supabaseAdmin
        .from("lesson_completions")
        .select("lesson_slug, completed_at")
        .eq("user_id", data.userId)
        .order("completed_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("quiz_attempts")
        .select("id, score, finished_at, mode")
        .eq("user_id", data.userId)
        .order("started_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("exam_simulations")
        .select("id, score, finished_at")
        .eq("user_id", data.userId)
        .order("started_at", { ascending: false })
        .limit(10),
    ]);
    return {
      lessons: lc.data ?? [],
      quizAttempts: qa.data ?? [],
      examSimulations: es.data ?? [],
    };
  });
