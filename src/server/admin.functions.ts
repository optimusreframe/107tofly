import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { md5 } from "js-md5";
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

// ============================================================
// Lessons CMS
// ============================================================

const TOPIC_ENUM = z.enum([
  "regulations","airspace","sectional","weather","performance",
  "operations","adm","emergencies","remote_id","maintenance",
]);
const LESSON_STATUS = z.enum(["draft","review","published","archived"]);
const QUESTION_STATUS = z.enum(["draft","reviewed","published","archived"]);

const lessonInputSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/i),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(1000),
  body_md: z.string().trim().min(1),
  topic: TOPIC_ENUM,
  week: z.number().int().min(1).max(4),
  day: z.number().int().min(1).max(28),
  order_index: z.number().int().min(0),
  est_minutes: z.number().int().min(1).max(600).default(30),
  sources: z.array(z.object({ title: z.string().min(1), url: z.string().url().optional() })).default([]),
  status: LESSON_STATUS.default("draft"),
  locale: z.string().min(2).max(8).default("en"),
  media_assets: z.array(z.any()).default([]),
});

async function checkLessonConflicts(
  input: { week?: number; day?: number; order_index?: number },
  excludeId?: string,
) {
  const conflicts: { weekDay?: { slug: string; title: string }; order?: { slug: string; title: string } } = {};
  if (input.week != null && input.day != null) {
    let q = supabaseAdmin.from("lessons").select("id, slug, title").eq("week", input.week).eq("day", input.day).neq("status", "archived");
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (data) conflicts.weekDay = { slug: data.slug, title: data.title };
  }
  if (input.order_index != null) {
    let q = supabaseAdmin.from("lessons").select("id, slug, title").eq("order_index", input.order_index).neq("status", "archived");
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (data) conflicts.order = { slug: data.slug, title: data.title };
  }
  return conflicts;
}

export const checkAdminLessonConflicts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ week: z.number().int().optional(), day: z.number().int().optional(), order_index: z.number().int().optional(), excludeId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    return await checkLessonConflicts(data, data.excludeId);
  });

export const getAdminLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);
    return { lessons: data ?? [] };
  });

export const getAdminLessonDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ idOrSlug: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const isUuid = /^[0-9a-f-]{36}$/i.test(data.idOrSlug);
    const q = supabaseAdmin.from("lessons").select("*");
    const { data: row, error } = await (isUuid ? q.eq("id", data.idOrSlug) : q.eq("slug", data.idOrSlug)).maybeSingle();
    if (error) throw new Error(error.message);
    return { lesson: row };
  });

export const createAdminLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => lessonInputSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const conflicts = await checkLessonConflicts(data);
    if (conflicts.weekDay) throw new Error(`LESSON_CONFLICT_WEEKDAY:${conflicts.weekDay.title}`);
    if (conflicts.order) throw new Error(`LESSON_CONFLICT_ORDER:${conflicts.order.title}`);
    const payload: Record<string, unknown> = {
      ...data,
      sources: data.sources as never,
      media_assets: data.media_assets as never,
      updated_by: context.userId,
      published_at: data.status === "published" ? new Date().toISOString() : null,
    };
    const { data: row, error } = await supabaseAdmin.from("lessons").insert(payload as never).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, "lesson_create", { entity: "lesson", entity_id: row.id, slug: row.slug, status: row.status });
    return { lesson: row };
  });

export const updateAdminLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), input: lessonInputSchema.partial() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const conflicts = await checkLessonConflicts(data.input, data.id);
    if (conflicts.weekDay) throw new Error(`LESSON_CONFLICT_WEEKDAY:${conflicts.weekDay.title}`);
    if (conflicts.order) throw new Error(`LESSON_CONFLICT_ORDER:${conflicts.order.title}`);
    const patch: Record<string, unknown> = {
      ...data.input,
      updated_by: context.userId,
    };
    if (data.input.status === "published") patch.published_at = new Date().toISOString();
    if (data.input.status === "archived") patch.archived_at = new Date().toISOString();
    const { data: row, error } = await supabaseAdmin.from("lessons").update(patch as never).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, "lesson_update", { entity: "lesson", entity_id: row.id, slug: row.slug, status: row.status, changes: Object.keys(data.input) });
    return { lesson: row };
  });

export const archiveAdminLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), restore: z.boolean().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const patch = data.restore
      ? { status: "draft", archived_at: null, updated_by: context.userId }
      : { status: "archived", archived_at: new Date().toISOString(), updated_by: context.userId };
    const { data: row, error } = await supabaseAdmin.from("lessons").update(patch as never).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, data.restore ? "lesson_restore" : "lesson_archive", { entity: "lesson", entity_id: row.id, slug: row.slug, status: row.status });
    return { lesson: row };
  });

export const duplicateAdminLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: src, error: e1 } = await supabaseAdmin.from("lessons").select("*").eq("id", data.id).maybeSingle();
    if (e1 || !src) throw new Error(e1?.message ?? "not found");
    const baseSlug = `${src.slug}-copy`;
    let slug = baseSlug; let n = 1;
    while (true) {
      const { data: ex } = await supabaseAdmin.from("lessons").select("id").eq("slug", slug).maybeSingle();
      if (!ex) break;
      n += 1; slug = `${baseSlug}-${n}`;
    }
    const copy: Record<string, unknown> = {
      slug,
      title: `${src.title} (Copy)`,
      summary: src.summary,
      body_md: src.body_md,
      topic: src.topic,
      week: src.week,
      day: src.day,
      order_index: src.order_index,
      est_minutes: src.est_minutes,
      sources: src.sources as never,
      media_assets: (src as { media_assets?: unknown }).media_assets ?? [],
      status: "draft",
      locale: (src as { locale?: string }).locale ?? "en",
      updated_by: context.userId,
    };
    const { data: row, error } = await supabaseAdmin.from("lessons").insert(copy as never).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, "lesson_duplicate", { entity: "lesson", entity_id: row.id, slug: row.slug, source_id: src.id });
    return { lesson: row };
  });

// ============================================================
// Questions CMS
// ============================================================

// Content hash: keep MD5 of normalized question text for consistency with the
// original seed migration (20260504070140) which stored md5(lower(regexp_replace(question,'\s+',' ','g'))).
// We extend the input to include options to better detect near-duplicates created via the CMS,
// but stay on md5/32-char hex so historical rows and new rows live in the same hash space.
function normalizeHash(text: string): string {
  const norm = text.toLowerCase().replace(/\s+/g, " ").trim();
  return md5(norm);
}

const questionInputSchema = z.object({
  question: z.string().trim().min(1),
  options: z.array(z.string()).length(4),
  correct_index: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1),
  common_mistake: z.string().trim().nullable().optional(),
  topic: TOPIC_ENUM,
  difficulty: z.enum(["easy","medium","hard"]),
  acs_code: z.string().trim().min(1),
  source: z.string().trim().min(1),
  tags: z.array(z.string()).default([]),
  status: QUESTION_STATUS.default("draft"),
  locale: z.string().min(2).max(8).default("en"),
});

function validateForPublish(q: z.infer<typeof questionInputSchema>) {
  if (q.status === "published" || q.status === "reviewed") {
    if (q.options.some((o) => !o.trim())) throw new Error("All 4 options are required for published/reviewed status");
    if (q.explanation.split(/\s+/).filter(Boolean).length < 80) throw new Error("Explanation must be at least 80 words for published/reviewed status");
    if (!q.source.trim()) throw new Error("Source required for published/reviewed status");
  }
}

export const getAdminQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return { questions: data ?? [] };
  });

export const getAdminQuestionDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin.from("questions").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return { question: row };
  });

export const createAdminQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => questionInputSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    validateForPublish(data);
    const content_hash = normalizeHash(data.question);
    const { data: dup } = await supabaseAdmin.from("questions").select("id").eq("content_hash", content_hash).maybeSingle();
    if (dup) throw new Error("A similar question already exists.");
    const payload: Record<string, unknown> = {
      ...data,
      options: data.options as never,
      tags: data.tags as never,
      content_hash,
      updated_by: context.userId,
      published_at: data.status === "published" ? new Date().toISOString() : null,
    };
    const { data: row, error } = await supabaseAdmin.from("questions").insert(payload as never).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, "question_create", { entity: "question", entity_id: row.id, topic: row.topic, difficulty: row.difficulty, status: row.status });
    return { question: row };
  });

export const updateAdminQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), input: questionInputSchema.partial() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: existing } = await supabaseAdmin.from("questions").select("*").eq("id", data.id).maybeSingle();
    if (!existing) throw new Error("Not found");
    const merged = { ...existing, ...data.input } as z.infer<typeof questionInputSchema>;
    if (data.input.status) validateForPublish(merged);
    const patch: Record<string, unknown> = { ...data.input, updated_by: context.userId };
    if (data.input.question) {
      const content_hash = normalizeHash(data.input.question);
      const { data: dup } = await supabaseAdmin.from("questions").select("id").eq("content_hash", content_hash).neq("id", data.id).maybeSingle();
      if (dup) throw new Error("A similar question already exists.");
      patch.content_hash = content_hash;
    }
    if (data.input.status === "published") patch.published_at = new Date().toISOString();
    if (data.input.status === "archived") patch.archived_at = new Date().toISOString();
    const { data: row, error } = await supabaseAdmin.from("questions").update(patch as never).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, "question_update", { entity: "question", entity_id: row.id, topic: row.topic, status: row.status, changes: Object.keys(data.input) });
    return { question: row };
  });

export const archiveAdminQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), restore: z.boolean().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const patch = data.restore
      ? { status: "draft", archived_at: null, updated_by: context.userId }
      : { status: "archived", archived_at: new Date().toISOString(), updated_by: context.userId };
    const { data: row, error } = await supabaseAdmin.from("questions").update(patch as never).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, data.restore ? "question_restore" : "question_archive", { entity: "question", entity_id: row.id, status: row.status });
    return { question: row };
  });

export const duplicateAdminQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: src, error: e1 } = await supabaseAdmin.from("questions").select("*").eq("id", data.id).maybeSingle();
    if (e1 || !src) throw new Error(e1?.message ?? "not found");
    const newQuestion = `${src.question} (Copy ${Date.now()})`;
    const content_hash = normalizeHash(newQuestion);
    const copy: Record<string, unknown> = {
      question: newQuestion,
      options: src.options as never,
      correct_index: src.correct_index,
      explanation: src.explanation,
      common_mistake: src.common_mistake,
      topic: src.topic,
      difficulty: src.difficulty,
      acs_code: src.acs_code,
      source: src.source,
      tags: (src.tags ?? []) as never,
      status: "draft",
      locale: (src as { locale?: string }).locale ?? "en",
      content_hash,
      updated_by: context.userId,
    };
    const { data: row, error } = await supabaseAdmin.from("questions").insert(copy as never).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, "question_duplicate", { entity: "question", entity_id: row.id, source_id: src.id });
    return { question: row };
  });

// ============== LANDING CMS ==============

const landingInputSchema = z.object({
  section_key: z.string().min(1).max(80),
  locale: z.enum(["en", "es"]),
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  cta_label: z.string().nullable().optional(),
  cta_href: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  content: z.record(z.string(), z.any()).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  sort_order: z.number().int().optional(),
});

export const getAdminLandingSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("landing_sections" as never)
      .select("*")
      .order("locale", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { sections: data ?? [] };
  });

export const upsertAdminLandingSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid().optional(), input: landingInputSchema }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const patch: Record<string, unknown> = { ...data.input, updated_by: context.userId };
    if (data.input.status === "published") patch.published_at = new Date().toISOString();
    if (data.input.status === "archived") patch.archived_at = new Date().toISOString();
    let row;
    if (data.id) {
      const r = await supabaseAdmin.from("landing_sections" as never).update(patch as never).eq("id", data.id).select("*").single();
      if (r.error) throw new Error(r.error.message);
      row = r.data;
    } else {
      const r = await supabaseAdmin.from("landing_sections" as never).insert(patch as never).select("*").single();
      if (r.error) throw new Error(r.error.message);
      row = r.data;
    }
    await logAudit(context.userId, null, "landing_update", { entity: "landing_section", entity_id: (row as { id: string }).id, section_key: data.input.section_key, locale: data.input.locale });
    return { section: row };
  });

export const publishAdminLandingSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("landing_sections" as never)
      .update({ status: "published", published_at: new Date().toISOString(), updated_by: context.userId } as never)
      .eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, "landing_publish", { entity_id: data.id });
    return { section: row };
  });

export const archiveAdminLandingSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), restore: z.boolean().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const patch = data.restore
      ? { status: "draft", archived_at: null, updated_by: context.userId }
      : { status: "archived", archived_at: new Date().toISOString(), updated_by: context.userId };
    const { data: row, error } = await supabaseAdmin.from("landing_sections" as never).update(patch as never).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, data.restore ? "landing_restore" : "landing_archive", { entity_id: data.id });
    return { section: row };
  });

export const duplicateAdminLandingSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), targetLocale: z.enum(["en", "es"]) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: src, error: e1 } = await supabaseAdmin.from("landing_sections" as never).select("*").eq("id", data.id).maybeSingle();
    if (e1 || !src) throw new Error(e1?.message ?? "not found");
    const s = src as Record<string, unknown>;
    const copy = {
      section_key: s.section_key, locale: data.targetLocale,
      title: s.title, subtitle: s.subtitle, body: s.body,
      cta_label: s.cta_label, cta_href: s.cta_href,
      image_url: s.image_url, video_url: s.video_url,
      content: s.content, status: "draft", sort_order: s.sort_order,
      updated_by: context.userId,
    };
    const { data: row, error } = await supabaseAdmin.from("landing_sections" as never).upsert(copy as never, { onConflict: "section_key,locale" }).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, "landing_duplicate", { source_id: data.id, target_locale: data.targetLocale });
    return { section: row };
  });

export const getPublicLandingSections = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ locale: z.enum(["en", "es"]) }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("landing_sections" as never)
      .select("section_key, locale, title, subtitle, body, cta_label, cta_href, image_url, video_url, content, sort_order")
      .eq("locale", data.locale)
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    return { sections: rows ?? [] };
  });

// ============== MEDIA LIBRARY ==============

const mediaInputSchema = z.object({
  file_name: z.string().min(1).max(255),
  file_type: z.string().min(1).max(40),
  mime_type: z.string().max(120).nullable().optional(),
  file_size: z.number().int().nullable().optional(),
  storage_path: z.string().nullable().optional(),
  public_url: z.string().url().nullable().optional(),
  alt_text: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  locale: z.enum(["en", "es"]).optional(),
  tags: z.array(z.string()).optional(),
  usage_context: z.string().nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const getAdminMediaAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("media_assets" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { assets: data ?? [] };
  });

export const createAdminMediaAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ input: mediaInputSchema }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const payload = { ...data.input, owner_id: context.userId };
    const { data: row, error } = await supabaseAdmin.from("media_assets" as never).insert(payload as never).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, "media_create", { entity_id: (row as { id: string }).id });
    return { asset: row };
  });

export const updateAdminMediaAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), input: mediaInputSchema.partial() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin.from("media_assets" as never).update(data.input as never).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, "media_update", { entity_id: data.id });
    return { asset: row };
  });

export const archiveAdminMediaAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), restore: z.boolean().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const patch = { status: data.restore ? "active" : "archived" };
    const { data: row, error } = await supabaseAdmin.from("media_assets" as never).update(patch as never).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, data.restore ? "media_restore" : "media_archive", { entity_id: data.id });
    return { asset: row };
  });

// ============== APP SETTINGS ==============

const SETTING_VALUE_SCHEMA = z.union([
  z.string(), z.number(), z.boolean(), z.null(),
  z.array(z.union([z.string(), z.number(), z.boolean()])),
  z.record(z.string(), z.any()),
]);

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("app_settings" as never)
      .select("*")
      .order("category", { ascending: true })
      .order("key", { ascending: true });
    if (error) throw new Error(error.message);
    return { settings: data ?? [] };
  });

export const updateAdminSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ key: z.string().min(1), value: SETTING_VALUE_SCHEMA }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: existing } = await supabaseAdmin
      .from("app_settings" as never)
      .select("category")
      .eq("key", data.key)
      .maybeSingle();
    const { data: row, error } = await supabaseAdmin
      .from("app_settings" as never)
      .update({ value: data.value as never, updated_by: context.userId } as never)
      .eq("key", data.key)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, null, "setting_update", {
      entity: "setting", key: data.key,
      category: (existing as { category?: string } | null)?.category ?? null,
    });
    return { setting: row };
  });

export const updateAdminSettingsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ settings: z.record(z.string(), SETTING_VALUE_SCHEMA) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const keys = Object.keys(data.settings);
    for (const key of keys) {
      await supabaseAdmin
        .from("app_settings" as never)
        .update({ value: data.settings[key] as never, updated_by: context.userId } as never)
        .eq("key", key);
    }
    await logAudit(context.userId, null, "settings_bulk_update", {
      entity: "setting", keys,
    });
    return { ok: true, count: keys.length };
  });

export const getPublicSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("app_settings" as never)
      .select("key, value, category")
      .eq("is_public", true);
    return { settings: data ?? [] };
  });

// ============== CERTIFICATES ADMIN ==============

export const getAdminCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [certsRes, authRes] = await Promise.all([
      supabaseAdmin
        .from("certificates")
        .select("*")
        .order("issued_at", { ascending: false })
        .limit(1000),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const emailMap = new Map<string, string>();
    for (const u of authRes.data?.users ?? []) {
      if (u.id && u.email) emailMap.set(u.id, u.email);
    }
    const certs = (certsRes.data ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      email: emailMap.get(c.user_id as string) ?? null,
    }));
    return { certificates: certs };
  });

export const getAdminCertificateDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: cert, error } = await supabaseAdmin
      .from("certificates").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!cert) return { certificate: null };
    const userId = (cert as { user_id: string }).user_id;
    const [authRes, qaRes, esRes, lcRes, audit] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(userId),
      supabaseAdmin.from("quiz_attempts").select("score").eq("user_id", userId),
      supabaseAdmin.from("exam_simulations").select("score").eq("user_id", userId).order("finished_at", { ascending: false }).limit(1),
      supabaseAdmin.from("lesson_completions").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdmin.from("admin_audit_logs").select("*").eq("target_user_id", userId).in("action", ["certificate_revoke","certificate_reissue"]).order("created_at", { ascending: false }).limit(20),
    ]);
    const totalLessons = await supabaseAdmin.from("lessons").select("*", { count: "exact", head: true });
    const quizScores = (qaRes.data ?? []).map((r: { score: number | null }) => Number(r.score ?? 0));
    const quizAvg = quizScores.length ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length : null;
    const latestExam = (esRes.data?.[0] as { score: number | null } | undefined)?.score ?? null;
    const lessonsDone = lcRes.count ?? 0;
    const totalLessonCount = totalLessons.count ?? 0;
    const completionPct = totalLessonCount ? Math.round((lessonsDone / totalLessonCount) * 100) : 0;
    return {
      certificate: cert,
      email: authRes.data?.user?.email ?? null,
      quizAverage: quizAvg,
      latestExamScore: latestExam,
      courseCompletionPct: completionPct,
      auditLogs: audit.data ?? [],
    };
  });

export const revokeAdminCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), reason: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("certificates")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: context.userId,
        revoke_reason: data.reason,
      } as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, (row as { user_id: string }).user_id, "certificate_revoke", {
      entity: "certificate", certificate_id: data.id, reason: data.reason,
    });
    return { certificate: row };
  });

export const reissueAdminCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: src, error: e1 } = await supabaseAdmin
      .from("certificates").select("*").eq("id", data.id).maybeSingle();
    if (e1 || !src) throw new Error(e1?.message ?? "not found");
    const s = src as Record<string, unknown>;
    // Revoke the old one (if active)
    if (s.status === "active") {
      await supabaseAdmin.from("certificates").update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: context.userId,
        revoke_reason: "Reissued",
      } as never).eq("id", data.id);
    }
    const { data: row, error } = await supabaseAdmin.from("certificates").insert({
      user_id: s.user_id,
      display_name: s.display_name,
      final_score: s.final_score,
      modules_completed: s.modules_completed,
      hours_estimated: s.hours_estimated,
      status: "active",
    } as never).select("*").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, (row as { user_id: string }).user_id, "certificate_reissue", {
      entity: "certificate", certificate_id: (row as { id: string }).id, source_id: data.id,
    });
    return { certificate: row };
  });

// ===================== ANALYTICS =====================

const TOPIC_KEYS = ["regulations","airspace","sectional","weather","performance","operations","adm","emergencies","remote_id","maintenance"] as const;

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const now = Date.now();
    const d7 = new Date(now - 7 * 86400000).toISOString();
    const d30 = new Date(now - 30 * 86400000).toISOString();

    const [profilesR, rolesR, lcR, qaR, esR, certR, progressR] = await Promise.all([
      supabaseAdmin.from("profiles").select("id"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("lesson_completions").select("user_id, completed_at"),
      supabaseAdmin.from("quiz_attempts").select("user_id, score, finished_at"),
      supabaseAdmin.from("exam_simulations").select("user_id, score, finished_at"),
      supabaseAdmin.from("certificates").select("user_id, status"),
      supabaseAdmin.from("progress").select("user_id, readiness, study_pct"),
    ]);

    const totalUsers = (profilesR.data ?? []).length;
    const adminIds = new Set((rolesR.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    const studentIds = new Set((rolesR.data ?? []).filter((r) => r.role === "student").map((r) => r.user_id));

    const activeIn = (rows: Array<{ user_id: string; finished_at?: string | null; completed_at?: string | null }>, since: string) => {
      const set = new Set<string>();
      for (const r of rows) {
        const ts = (r as { finished_at?: string | null }).finished_at ?? (r as { completed_at?: string | null }).completed_at;
        if (ts && ts >= since) set.add(r.user_id);
      }
      return set;
    };
    const allEvents = [
      ...(lcR.data ?? []).map((r) => ({ user_id: r.user_id, completed_at: r.completed_at })),
      ...(qaR.data ?? []).map((r) => ({ user_id: r.user_id, finished_at: r.finished_at })),
      ...(esR.data ?? []).map((r) => ({ user_id: r.user_id, finished_at: r.finished_at })),
    ];
    const active7 = activeIn(allEvents, d7).size;
    const active30 = activeIn(allEvents, d30).size;

    const certs = certR.data ?? [];
    const certActive = certs.filter((c) => c.status !== "revoked").length;
    const certRevoked = certs.filter((c) => c.status === "revoked").length;

    const qa = qaR.data ?? [];
    const es = esR.data ?? [];
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const avgQuiz = avg(qa.map((q) => Number(q.score) || 0));
    const avgExam = avg(es.map((q) => Number(q.score) || 0));

    const prog = progressR.data ?? [];
    const avgReadiness = avg(prog.map((p) => Number(p.readiness) || 0));
    const completionRate = prog.length ? (prog.filter((p) => (p.study_pct ?? 0) >= 100).length / prog.length) * 100 : 0;
    const examReady = prog.filter((p) => (p.readiness ?? 0) >= 85).length;
    const courseCompleted = prog.filter((p) => (p.study_pct ?? 0) >= 100).length;

    return {
      totalUsers,
      totalStudents: studentIds.size,
      totalAdmins: adminIds.size,
      activeStudents7d: active7,
      activeStudents30d: active30,
      totalLessonsCompleted: (lcR.data ?? []).length,
      totalQuizAttempts: qa.length,
      totalExamSimulations: es.length,
      totalCertificates: certs.length,
      certificatesActive: certActive,
      certificatesRevoked: certRevoked,
      averageQuizScore: Math.round(avgQuiz),
      averageExamScore: Math.round(avgExam),
      averageReadinessScore: Math.round(avgReadiness),
      completionRate: Math.round(completionRate),
      examReadyCount: examReady,
      courseCompletedCount: courseCompleted,
    };
  });

export const getAdminTopicAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [qaR, qR, ansR] = await Promise.all([
      supabaseAdmin.from("quiz_attempts").select("topic, score"),
      supabaseAdmin.from("questions").select("id, topic, status"),
      supabaseAdmin.from("quiz_answers").select("question_id, is_correct"),
    ]);

    const qById = new Map<string, string>();
    for (const q of qR.data ?? []) qById.set(q.id, (q.topic as string) ?? "unknown");
    const missCount = new Map<string, number>();
    const totalAns = new Map<string, number>();
    for (const a of ansR.data ?? []) {
      const t = qById.get(a.question_id) ?? "unknown";
      totalAns.set(t, (totalAns.get(t) ?? 0) + 1);
      if (!a.is_correct) missCount.set(t, (missCount.get(t) ?? 0) + 1);
    }
    const qCount = new Map<string, number>();
    for (const q of qR.data ?? []) {
      if (q.status !== "archived") qCount.set(q.topic as string, (qCount.get(q.topic as string) ?? 0) + 1);
    }

    return TOPIC_KEYS.map((topic) => {
      const attempts = (qaR.data ?? []).filter((a) => a.topic === topic);
      const avgScore = attempts.length ? attempts.reduce((s, a) => s + Number(a.score), 0) / attempts.length : 0;
      const total = totalAns.get(topic) ?? 0;
      const miss = missCount.get(topic) ?? 0;
      const weakRate = total ? (miss / total) * 100 : 0;
      return {
        topic,
        quizAttempts: attempts.length,
        averageScore: Math.round(avgScore),
        questionCount: qCount.get(topic) ?? 0,
        mostMissedCount: miss,
        weakRate: Math.round(weakRate),
      };
    });
  });

export const getAdminQuestionAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [qR, ansR] = await Promise.all([
      supabaseAdmin.from("questions").select("id, question, topic, difficulty, source, acs_code"),
      supabaseAdmin.from("quiz_answers").select("question_id, is_correct, selected_index"),
    ]);
    const stats = new Map<string, { total: number; correct: number; wrongCounts: Map<number, number> }>();
    for (const a of ansR.data ?? []) {
      const s = stats.get(a.question_id) ?? { total: 0, correct: 0, wrongCounts: new Map() };
      s.total += 1;
      if (a.is_correct) s.correct += 1;
      else s.wrongCounts.set(a.selected_index, (s.wrongCounts.get(a.selected_index) ?? 0) + 1);
      stats.set(a.question_id, s);
    }
    const out = (qR.data ?? []).map((q) => {
      const s = stats.get(q.id) ?? { total: 0, correct: 0, wrongCounts: new Map<number, number>() };
      let mostWrong: number | null = null;
      let max = 0;
      for (const [k, v] of s.wrongCounts) if (v > max) { max = v; mostWrong = k; }
      return {
        questionId: q.id,
        question: (q.question ?? "").slice(0, 120),
        topic: q.topic,
        difficulty: q.difficulty,
        totalAnswers: s.total,
        correctAnswers: s.correct,
        incorrectAnswers: s.total - s.correct,
        correctRate: s.total ? Math.round((s.correct / s.total) * 100) : 0,
        mostSelectedWrongOption: mostWrong,
        source: q.source,
        acsCode: q.acs_code,
      };
    }).filter((q) => q.totalAnswers > 0)
      .sort((a, b) => a.correctRate - b.correctRate)
      .slice(0, 25);
    return out;
  });

export const getAdminStudentFunnel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [profilesR, lcR, qaR, esR, certR, progressR] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, experience_level"),
      supabaseAdmin.from("lesson_completions").select("user_id, lesson_slug"),
      supabaseAdmin.from("quiz_attempts").select("user_id, mode"),
      supabaseAdmin.from("exam_simulations").select("user_id"),
      supabaseAdmin.from("certificates").select("user_id"),
      supabaseAdmin.from("progress").select("user_id, study_pct, readiness"),
    ]);
    const profiles = profilesR.data ?? [];
    const onboarded = profiles.filter((p) => p.experience_level).length;
    const lessonByUser = new Map<string, Set<string>>();
    for (const l of lcR.data ?? []) {
      const s = lessonByUser.get(l.user_id) ?? new Set();
      s.add(l.lesson_slug);
      lessonByUser.set(l.user_id, s);
    }
    const startedCourse = lessonByUser.size;
    const completedFirst = startedCourse;
    const week1Done = [...lessonByUser.values()].filter((s) => s.size >= 7).length;
    const completedCourse = (progressR.data ?? []).filter((p) => (p.study_pct ?? 0) >= 100).length;
    const tookPractice = new Set((qaR.data ?? []).map((a) => a.user_id)).size;
    const tookSim = new Set((esR.data ?? []).map((a) => a.user_id)).size;
    const examReady = (progressR.data ?? []).filter((p) => (p.readiness ?? 0) >= 85).length;
    const certs = new Set((certR.data ?? []).map((c) => c.user_id)).size;

    return {
      signedUp: profiles.length,
      onboarded,
      startedCourse,
      completedFirstLesson: completedFirst,
      completedWeek1: week1Done,
      completedCourse,
      tookPractice,
      tookSimulator: tookSim,
      examReady,
      certificateIssued: certs,
    };
  });
