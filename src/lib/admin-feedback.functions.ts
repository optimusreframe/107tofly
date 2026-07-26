import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => r.role === "admin")) throw new Response("FORBIDDEN", { status: 403 });
}

export const listExerciseFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("session_events")
      .select("id,created_at,user_id,unit_id,concept_id,exercise_id,note")
      .eq("kind", "feedback")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const rows = data ?? [];

    const exIds = Array.from(new Set(rows.map((r) => r.exercise_id).filter(Boolean) as string[]));
    const conceptIds = Array.from(new Set(rows.map((r) => r.concept_id).filter(Boolean) as string[]));
    const unitIds = Array.from(new Set(rows.map((r) => r.unit_id).filter(Boolean) as string[]));

    const [exs, concepts, units] = await Promise.all([
      exIds.length
        ? supabaseAdmin.from("exercises").select("id,kind,payload,locale,concept_id").in("id", exIds)
        : Promise.resolve({ data: [] as any[] }),
      conceptIds.length
        ? supabaseAdmin.from("concepts").select("id,title,unit_id").in("id", conceptIds)
        : Promise.resolve({ data: [] as any[] }),
      unitIds.length
        ? supabaseAdmin.from("learning_units").select("id,slug,title,locale").in("id", unitIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const exMap = new Map((exs.data ?? []).map((e: any) => [e.id, e]));
    const conceptMap = new Map((concepts.data ?? []).map((c: any) => [c.id, c]));
    const unitMap = new Map((units.data ?? []).map((u: any) => [u.id, u]));

    return {
      items: rows.map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        userId: r.user_id,
        note: r.note,
        exercise: r.exercise_id ? exMap.get(r.exercise_id) ?? null : null,
        concept: r.concept_id ? conceptMap.get(r.concept_id) ?? null : null,
        unit: r.unit_id ? unitMap.get(r.unit_id) ?? null : null,
      })),
    };
  });

export const dismissFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("session_events").delete().eq("id", data.id).eq("kind", "feedback");
    if (error) throw error;
    return { ok: true };
  });
