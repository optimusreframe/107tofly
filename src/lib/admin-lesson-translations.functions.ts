import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => r.role === "admin")) throw new Error("FORBIDDEN");
}
async function logAudit(adminUserId: string, action: string, metadata: Record<string, unknown> = {}) {
  await supabaseAdmin.from("admin_audit_logs").insert({
    admin_user_id: adminUserId,
    target_user_id: null,
    action,
    metadata: metadata as never,
  });
}

// ============ STATUS ============
export const getLessonTranslationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: lesson, error } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lesson) throw new Error("Lesson not found");
    const groupId = (lesson as { translation_group_id?: string | null }).translation_group_id ?? lesson.id;
    const { data: group } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("translation_group_id", groupId);
    return { source: lesson, group: group ?? [] };
  });

// ============ AI DRAFT ============
const SYSTEM_PROMPT = `Translate this FAA Part 107 lesson from English to Latin American Spanish.
Rules:
- Preserve Markdown structure exactly (headings, lists, tables, emphasis, links, code blocks).
- Keep FAA, Part 107, UAG, Remote Pilot, Remote PIC, ACS, LAANC, METAR, TAF, NOTAM, TFR, VLOS, AGL, MSL, CTAF, ATIS, AWOS, ASOS, Class B/C/D/E/G, Remote ID, DroneZone, IACRA, ADM, CRM in English.
- Do not translate acronyms, regulatory references, citations, source names, CFR sections or FAA document titles.
- Do not change factual meaning. Keep aviation precision.
- Use natural Latin American Spanish. Educational, clear tone.
- Return ONLY valid JSON. No prose, no code fences.`;

type LessonDraftPayload = {
  title: string;
  summary: string;
  body_md: string;
  warnings: string[];
};

function validateLessonDraft(raw: unknown): LessonDraftPayload {
  const obj = raw as Record<string, unknown>;
  if (!obj || typeof obj !== "object") throw new Error("Invalid AI response: not an object");
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
  const body_md = typeof obj.body_md === "string" ? obj.body_md : "";
  const warnings = Array.isArray(obj.warnings) ? obj.warnings.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
  if (!title) throw new Error("Invalid AI response: missing title");
  if (!summary) throw new Error("Invalid AI response: missing summary");
  if (!body_md.trim()) throw new Error("Invalid AI response: missing body_md");
  return { title, summary, body_md, warnings };
}

export const generateLessonSpanishDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
    const { data: src, error } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!src) throw new Error("Lesson not found");
    if (src.locale !== "en") throw new Error("Only EN lessons can be translated to ES");

    const userPayload = {
      title: src.title,
      summary: src.summary,
      body_md: src.body_md,
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Translate to Latin American Spanish. Source JSON:\n${JSON.stringify(userPayload)}\n\nReturn JSON with keys: title (string), summary (string), body_md (string, full Markdown), warnings (string[]).` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Rate limit reached. Try again later.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI gateway error (${res.status})`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content?.trim() ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Invalid AI response: not JSON");
      parsed = JSON.parse(m[0]);
    }
    const draft = validateLessonDraft(parsed);

    await logAudit(context.userId, "lesson_ai_translate_generate", {
      source_lesson_id: src.id,
      slug: src.slug,
      source_locale: "en",
      target_locale: "es",
      provider: "lovable-ai",
      model: "google/gemini-2.5-flash",
    });

    return {
      draft,
      source: src,
      meta: {
        provider: "lovable-ai",
        model: "google/gemini-2.5-flash",
        generated_at: new Date().toISOString(),
        admin_user_id: context.userId,
        warnings: draft.warnings,
        source_lesson_id: src.id,
      },
    };
  });

// ============ SAVE ============
const SaveIn = z.object({
  sourceLessonId: z.string().uuid(),
  targetLessonId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  body_md: z.string().trim().min(1),
  translation_status: z.enum(["ai_draft", "reviewed", "published", "needs_review"]),
  lesson_status: z.enum(["draft", "review", "published", "archived"]),
  ai_metadata: z.record(z.string(), z.unknown()).optional(),
  overwritePublished: z.boolean().optional(),
});

export const saveLessonSpanishTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveIn.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: src, error: e1 } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("id", data.sourceLessonId)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!src || src.locale !== "en") throw new Error("Source EN lesson not found");

    const groupId = (src as { translation_group_id?: string | null }).translation_group_id ?? src.id;

    // Find existing ES translation in this group
    const { data: existingEs } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("translation_group_id", groupId)
      .eq("locale", "es")
      .maybeSingle();

    let targetId = data.targetLessonId ?? null;
    if (existingEs && (!targetId || existingEs.id !== targetId)) {
      targetId = existingEs.id;
    }

    if (existingEs && existingEs.status === "published" && !data.overwritePublished) {
      throw new Error("PUBLISHED_ES_EXISTS");
    }

    const basePatch: Record<string, unknown> = {
      slug: src.slug,
      title: data.title,
      summary: data.summary,
      body_md: data.body_md,
      topic: src.topic,
      week: src.week,
      day: src.day,
      order_index: src.order_index,
      est_minutes: src.est_minutes,
      sources: src.sources as never,
      media_assets: (src as { media_assets?: unknown }).media_assets ?? [],
      locale: "es",
      status: data.lesson_status,
      translation_group_id: groupId,
      source_lesson_id: src.id,
      translated_from_locale: "en",
      translation_status: data.translation_status,
      ai_translation_metadata: (data.ai_metadata ?? {}) as never,
      updated_by: context.userId,
      published_at: data.lesson_status === "published" ? new Date().toISOString() : null,
    };

    let row;
    if (targetId) {
      const { data: updated, error } = await supabaseAdmin
        .from("lessons")
        .update(basePatch as never)
        .eq("id", targetId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      row = updated;
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("lessons")
        .insert(basePatch as never)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      row = inserted;
    }

    await logAudit(context.userId, "lesson_translation_save", {
      source_lesson_id: src.id,
      translated_lesson_id: row.id,
      slug: row.slug,
      source_locale: "en",
      target_locale: "es",
      translation_status: data.translation_status,
      lesson_status: data.lesson_status,
      provider: "lovable-ai",
    });

    return { lesson: row };
  });

// ============ STATUS TRANSITIONS ============
export const publishLessonTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("lessons")
      .update({
        status: "published",
        translation_status: "published",
        published_at: new Date().toISOString(),
        updated_by: context.userId,
      } as never)
      .eq("id", data.lessonId)
      .eq("locale", "es")
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "lesson_translation_publish", {
      translated_lesson_id: row.id,
      slug: row.slug,
      target_locale: "es",
    });
    return { lesson: row };
  });

export const markLessonTranslationReviewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("lessons")
      .update({
        translation_status: "reviewed",
        status: "review",
        updated_by: context.userId,
      } as never)
      .eq("id", data.lessonId)
      .eq("locale", "es")
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "lesson_translation_review", {
      translated_lesson_id: row.id,
      slug: row.slug,
      target_locale: "es",
    });
    return { lesson: row };
  });
