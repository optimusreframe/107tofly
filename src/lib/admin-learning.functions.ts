import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => r.role === "admin")) throw new Error("FORBIDDEN");
}

const LOCALE = z.enum(["en", "es"]);
const STATUS = z.enum(["draft", "review", "published", "archived"]);
const KIND = z.enum(["mcq", "cloze", "order", "match"]);

// ---------- Units ----------
export const listAdminUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("learning_units")
      .select("id,slug,locale,title,summary,order_index,status,translation_group_id,lesson_id,updated_at")
      .order("order_index", { ascending: true });
    if (error) throw error;
    return { units: data ?? [] };
  });

export const upsertAdminUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    slug: z.string().min(1).max(160),
    locale: LOCALE,
    title: z.string().min(1).max(200),
    summary: z.string().max(2000).optional().default(""),
    order_index: z.number().int().min(0).default(0),
    status: STATUS.default("draft"),
    translation_group_id: z.string().uuid().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch = {
      slug: data.slug, locale: data.locale, title: data.title, summary: data.summary,
      order_index: data.order_index, status: data.status,
      translation_group_id: data.translation_group_id ?? null,
    } as never;
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("learning_units").update(patch).eq("id", data.id).select().single();
      if (error) throw error;
      return { unit: row };
    }
    const { data: row, error } = await supabaseAdmin
      .from("learning_units").insert(patch).select().single();
    if (error) throw error;
    return { unit: row };

  });

export const deleteAdminUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("learning_units").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Concepts ----------
export const listAdminConcepts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ unit_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("concepts").select("id,unit_id,title,body_md,order_index,locale,updated_at")
      .eq("unit_id", data.unit_id).order("order_index", { ascending: true });
    if (error) throw error;
    return { concepts: rows ?? [] };
  });

export const upsertAdminConcept = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    unit_id: z.string().uuid(),
    title: z.string().min(1).max(200),
    body_md: z.string().max(20000).optional().default(""),
    order_index: z.number().int().min(0).default(0),
    locale: LOCALE.default("en"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.id) {
      const { data: row, error } = await supabaseAdmin.from("concepts").update({
        unit_id: data.unit_id, title: data.title, body_md: data.body_md,
        order_index: data.order_index, locale: data.locale,
      }).eq("id", data.id).select().single();
      if (error) throw error;
      return { concept: row };
    }
    const { data: row, error } = await supabaseAdmin.from("concepts").insert({
      unit_id: data.unit_id, title: data.title, body_md: data.body_md,
      order_index: data.order_index, locale: data.locale,
    }).select().single();
    if (error) throw error;
    return { concept: row };
  });

export const deleteAdminConcept = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("concepts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Exercises ----------
export const listAdminExercises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ concept_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("exercises").select("id,concept_id,kind,payload,answer,explanation,difficulty,locale,updated_at")
      .eq("concept_id", data.concept_id).order("created_at", { ascending: true });
    if (error) throw error;
    return { exercises: rows ?? [] };
  });

export const upsertAdminExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    concept_id: z.string().uuid(),
    kind: KIND,
    payload: z.record(z.string(), z.unknown()),
    answer: z.record(z.string(), z.unknown()),
    explanation: z.string().max(4000).optional().default(""),
    difficulty: z.number().int().min(1).max(5).default(1),
    locale: LOCALE.default("en"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch = {
      concept_id: data.concept_id, kind: data.kind, payload: data.payload as never,
      answer: data.answer as never, explanation: data.explanation,
      difficulty: data.difficulty, locale: data.locale,
    };
    if (data.id) {
      const { data: row, error } = await supabaseAdmin.from("exercises").update(patch).eq("id", data.id).select().single();
      if (error) throw error;
      return { exercise: row };
    }
    const { data: row, error } = await supabaseAdmin.from("exercises").insert(patch).select().single();
    if (error) throw error;
    return { exercise: row };
  });

export const deleteAdminExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("exercises").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
