import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { md5 } from "js-md5";
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
function normalizeHash(text: string) {
  return md5(text.trim().toLowerCase().replace(/\s+/g, " "));
}

// ============ STATUS ============
export const getQuestionTranslationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ questionId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: q, error } = await supabaseAdmin
      .from("questions")
      .select("*")
      .eq("id", data.questionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!q) throw new Error("Question not found");
    const groupId = (q as { translation_group_id?: string | null }).translation_group_id ?? q.id;
    const { data: group } = await supabaseAdmin
      .from("questions")
      .select("*")
      .eq("translation_group_id", groupId);
    return { source: q, group: group ?? [] };
  });

// ============ AI DRAFT ============
const DraftIn = z.object({ questionId: z.string().uuid() });

const SYSTEM_PROMPT = `Translate this FAA Part 107 study question from English to Latin American Spanish.
Rules:
- Keep FAA, Part 107, UAG, Remote Pilot, Remote PIC, ACS, LAANC, METAR, TAF, NOTAM, TFR, VLOS, AGL, MSL, CTAF, ATIS, AWOS, ASOS, Class B/C/D/E/G, Remote ID, DroneZone, IACRA, ADM, CRM in English.
- Do not translate acronyms or regulatory references (e.g., 14 CFR 107.x).
- Do not change the correct answer index.
- Do not change the meaning.
- Preserve aviation precision.
- Use natural Latin American Spanish.
- Keep the explanation educational and clear.
- Return ONLY valid JSON matching the schema. No prose, no code fences.`;

type DraftPayload = {
  question: string;
  options: string[];
  explanation: string;
  common_mistake: string;
  tags: string[];
  warnings: string[];
};

function validateDraftJson(raw: unknown, expectedOptionsLen: number): DraftPayload {
  const obj = raw as Record<string, unknown>;
  if (!obj || typeof obj !== "object") throw new Error("Invalid AI response: not an object");
  const question = typeof obj.question === "string" ? obj.question.trim() : "";
  const options = Array.isArray(obj.options) ? obj.options.map((x) => String(x ?? "").trim()) : [];
  const explanation = typeof obj.explanation === "string" ? obj.explanation.trim() : "";
  const common_mistake = typeof obj.common_mistake === "string" ? obj.common_mistake.trim() : "";
  const tags = Array.isArray(obj.tags) ? obj.tags.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
  const warnings = Array.isArray(obj.warnings) ? obj.warnings.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
  if (!question) throw new Error("Invalid AI response: missing question");
  if (options.length !== expectedOptionsLen) throw new Error(`Invalid AI response: expected ${expectedOptionsLen} options, got ${options.length}`);
  if (options.some((o) => !o)) throw new Error("Invalid AI response: empty option");
  if (!explanation) throw new Error("Invalid AI response: missing explanation");
  return { question, options, explanation, common_mistake, tags, warnings };
}

export const generateQuestionSpanishDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DraftIn.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
    const { data: src, error } = await supabaseAdmin
      .from("questions")
      .select("*")
      .eq("id", data.questionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!src) throw new Error("Question not found");
    if (src.locale !== "en") throw new Error("Only EN questions can be translated to ES");

    const userPayload = {
      question: src.question,
      options: src.options as string[],
      explanation: src.explanation,
      common_mistake: src.common_mistake ?? "",
      tags: (src.tags ?? []) as string[],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Translate to Spanish. Source JSON:\n${JSON.stringify(userPayload, null, 2)}\n\nReturn JSON with keys: question, options (4), explanation, common_mistake, tags, warnings.` },
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
    const draft = validateDraftJson(parsed, (src.options as string[]).length);

    await logAudit(context.userId, "question_ai_translate_generate", {
      source_question_id: src.id,
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
      },
    };
  });

// ============ SAVE ============
const SaveIn = z.object({
  sourceQuestionId: z.string().uuid(),
  targetQuestionId: z.string().uuid().nullable().optional(),
  question: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).length(4),
  explanation: z.string().trim().min(1),
  common_mistake: z.string().trim().nullable().optional(),
  tags: z.array(z.string()).default([]),
  translation_status: z.enum(["ai_draft", "reviewed", "published", "needs_review"]),
  question_status: z.enum(["draft", "reviewed", "published", "archived"]),
  ai_metadata: z.record(z.string(), z.unknown()).optional(),
  overwritePublished: z.boolean().optional(),
});

export const saveQuestionSpanishTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveIn.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: src, error: e1 } = await supabaseAdmin
      .from("questions")
      .select("*")
      .eq("id", data.sourceQuestionId)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!src || src.locale !== "en") throw new Error("Source EN question not found");

    const groupId = (src as { translation_group_id?: string | null }).translation_group_id ?? src.id;

    // Find existing ES translation in this group (other than self)
    const { data: existingEs } = await supabaseAdmin
      .from("questions")
      .select("*")
      .eq("translation_group_id", groupId)
      .eq("locale", "es")
      .maybeSingle();

    if (existingEs && (!data.targetQuestionId || existingEs.id !== data.targetQuestionId)) {
      // refer to existing one
      data.targetQuestionId = existingEs.id;
    }

    if (existingEs && existingEs.status === "published" && !data.overwritePublished) {
      throw new Error("PUBLISHED_ES_EXISTS");
    }

    const content_hash = normalizeHash(data.question);
    // dedupe vs other ES rows
    const dupQ = supabaseAdmin
      .from("questions")
      .select("id")
      .eq("content_hash", content_hash)
      .eq("locale", "es");
    const { data: dupRows } = await dupQ;
    const conflict = (dupRows ?? []).find((r) => r.id !== (data.targetQuestionId ?? ""));
    if (conflict) throw new Error("SIMILAR_ES_EXISTS");

    const basePatch = {
      question: data.question,
      options: data.options as never,
      correct_index: src.correct_index,
      explanation: data.explanation,
      common_mistake: data.common_mistake ?? null,
      topic: src.topic,
      difficulty: src.difficulty,
      acs_code: src.acs_code,
      source: src.source,
      tags: data.tags as never,
      locale: "es",
      status: data.question_status,
      content_hash,
      translation_group_id: groupId,
      source_question_id: src.id,
      translated_from_locale: "en",
      translation_status: data.translation_status,
      ai_translation_metadata: (data.ai_metadata ?? {}) as never,
      updated_by: context.userId,
      published_at: data.question_status === "published" ? new Date().toISOString() : null,
    };

    let row;
    if (data.targetQuestionId) {
      const { data: updated, error } = await supabaseAdmin
        .from("questions")
        .update(basePatch as never)
        .eq("id", data.targetQuestionId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      row = updated;
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("questions")
        .insert(basePatch as never)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      row = inserted;
    }

    await logAudit(context.userId, "question_translation_save", {
      source_question_id: src.id,
      translated_question_id: row.id,
      source_locale: "en",
      target_locale: "es",
      translation_status: data.translation_status,
      question_status: data.question_status,
      provider: "lovable-ai",
    });

    return { question: row };
  });

// ============ STATUS TRANSITIONS ============
export const publishQuestionTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ questionId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("questions")
      .update({
        status: "published",
        translation_status: "published",
        published_at: new Date().toISOString(),
        updated_by: context.userId,
      } as never)
      .eq("id", data.questionId)
      .eq("locale", "es")
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "question_translation_publish", {
      translated_question_id: row.id,
      target_locale: "es",
    });
    return { question: row };
  });

export const markQuestionTranslationReviewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ questionId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("questions")
      .update({
        translation_status: "reviewed",
        status: "reviewed",
        updated_by: context.userId,
      } as never)
      .eq("id", data.questionId)
      .eq("locale", "es")
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "question_translation_review", {
      translated_question_id: row.id,
      target_locale: "es",
    });
    return { question: row };
  });
