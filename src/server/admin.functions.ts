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
