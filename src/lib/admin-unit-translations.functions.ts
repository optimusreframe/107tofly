import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => r.role === "admin")) throw new Error("FORBIDDEN");
}

const SYSTEM_PROMPT = `You translate FAA Part 107 learning content from English into Latin American Spanish.
Rules:
- Return ONLY valid JSON. No prose, no code fences.
- Keep FAA, Part 107, VLOS, AGL, MSL, METAR, TAF, NOTAM, TFR, CFR, ACS, LAANC, ATIS, ATC, MEF, VOR, GPS, TAS, ASI, VSI, RAIM in English.
- Preserve numeric values and units unchanged.
- Preserve JSON object structure and array order strictly. Keep the SAME array length everywhere.
- Do not translate keys. Only translate string values.
- For MCQ: translate "prompt", each string in "options", and "hint" if present. Keep option order (correct-answer index is by position).
- For cloze: translate "prompt" and "hint" (keep "____" placeholder verbatim if present).
- For order: translate "prompt" and each string in "items". Keep item order.
- For match: translate "prompt", "left", "right". Keep order.
- Translate "explanation".
- Use natural aviation Latin American Spanish, educational tone.`;

type ExRow = {
  id: string;
  kind: string;
  payload: Record<string, any>;
  explanation: string | null;
  difficulty: number;
  concept_order: number;
  concept_title: string;
};

export const translateUnitToSpanish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ unitId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: srcUnit } = await supabaseAdmin
      .from("learning_units").select("*").eq("id", data.unitId).maybeSingle();
    if (!srcUnit) throw new Error("Unit not found");
    if (srcUnit.locale !== "en") throw new Error("Only EN units can be translated");

    const { data: srcConcepts } = await supabaseAdmin
      .from("concepts").select("*").eq("unit_id", srcUnit.id).order("order_index");
    const conceptIds = (srcConcepts ?? []).map((c) => c.id as string);
    const { data: srcExercises } = conceptIds.length
      ? await supabaseAdmin.from("exercises").select("*").in("concept_id", conceptIds)
      : { data: [] as any[] };

    // Build compact translation payload
    const payload = {
      unit: { title: srcUnit.title, summary: srcUnit.summary ?? "" },
      concepts: (srcConcepts ?? []).map((c) => ({
        id: c.id, title: c.title, body_md: c.body_md ?? "",
      })),
      exercises: (srcExercises ?? []).map((e) => ({
        id: e.id, kind: e.kind, payload: e.payload, explanation: e.explanation ?? "",
      })),
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Translate the following unit content to Latin American Spanish. Preserve ids exactly.\n\n${JSON.stringify(payload)}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Rate limit reached. Try again later.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI gateway error (${res.status})`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content?.trim() ?? "";
    let parsed: any;
    try { parsed = JSON.parse(content); }
    catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Invalid AI response: not JSON");
      parsed = JSON.parse(m[0]);
    }
    if (!parsed?.unit || !Array.isArray(parsed.concepts) || !Array.isArray(parsed.exercises)) {
      throw new Error("Invalid AI translation shape");
    }

    // Reuse or create ES unit sharing translation_group_id
    const groupId = (srcUnit as any).translation_group_id ?? crypto.randomUUID();
    if (!(srcUnit as any).translation_group_id) {
      await supabaseAdmin.from("learning_units").update({ translation_group_id: groupId }).eq("id", srcUnit.id);
    }

    const { data: existingEs } = await supabaseAdmin
      .from("learning_units").select("id").eq("translation_group_id", groupId).eq("locale", "es").maybeSingle();

    let esUnitId: string;
    if (existingEs) {
      esUnitId = existingEs.id as string;
      await supabaseAdmin.from("learning_units").update({
        title: parsed.unit.title, summary: parsed.unit.summary ?? "",
        order_index: srcUnit.order_index, status: "draft",
      }).eq("id", esUnitId);
      // Wipe existing concepts (cascade wipes exercises)
      await supabaseAdmin.from("concepts").delete().eq("unit_id", esUnitId);
    } else {
      const { data: created, error } = await supabaseAdmin.from("learning_units").insert({
        slug: srcUnit.slug, locale: "es", title: parsed.unit.title,
        summary: parsed.unit.summary ?? "", order_index: srcUnit.order_index,
        status: "draft", translation_group_id: groupId,
      }).select("id").single();
      if (error || !created) throw new Error(error?.message ?? "Failed to create ES unit");
      esUnitId = created.id as string;
    }

    // Insert concepts
    const conceptIdMap = new Map<string, string>(); // en_id -> es_id
    for (const srcC of srcConcepts ?? []) {
      const tC = (parsed.concepts as any[]).find((x) => x.id === srcC.id) ?? { title: srcC.title, body_md: srcC.body_md };
      const { data: insC, error: eC } = await supabaseAdmin.from("concepts").insert({
        unit_id: esUnitId, order_index: srcC.order_index, title: tC.title ?? srcC.title,
        body_md: tC.body_md ?? "", locale: "es",
      }).select("id").single();
      if (eC || !insC) throw new Error(eC?.message ?? "Failed to insert concept");
      conceptIdMap.set(srcC.id as string, insC.id as string);
    }

    // Insert exercises with translated payload; answers stay identical
    for (const srcE of srcExercises ?? []) {
      const tE = (parsed.exercises as any[]).find((x) => x.id === srcE.id);
      const translatedPayload = tE?.payload ?? srcE.payload;
      const explanation = typeof tE?.explanation === "string" ? tE.explanation : (srcE.explanation ?? "");
      const esConcept = conceptIdMap.get(srcE.concept_id as string);
      if (!esConcept) continue;
      const { error: eE } = await supabaseAdmin.from("exercises").insert({
        concept_id: esConcept, kind: srcE.kind, payload: translatedPayload,
        answer: srcE.answer, explanation, difficulty: srcE.difficulty, locale: "es",
      });
      if (eE) throw new Error(eE.message);
    }

    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_user_id: context.userId, target_user_id: null,
      action: "unit_ai_translate", metadata: { source_unit_id: srcUnit.id, target_unit_id: esUnitId } as never,
    });

    return { esUnitId, groupId, conceptCount: (srcConcepts ?? []).length, exerciseCount: (srcExercises ?? []).length };
  });
