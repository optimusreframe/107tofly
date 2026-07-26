import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listPublishedUnits = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ locale: z.enum(["en", "es"]).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const locale = data.locale ?? "en";
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("learning_units")
      .select("id,slug,locale,title,summary,order_index,translation_group_id")
      .eq("status", "published")
      .order("order_index", { ascending: true });
    if (error) throw error;
    // Deduplicate by translation_group_id, prefer requested locale, fallback EN.
    const byGroup = new Map<string, typeof rows[number]>();
    for (const r of rows ?? []) {
      const gid = r.translation_group_id ?? r.id;
      const cur = byGroup.get(gid);
      if (!cur) { byGroup.set(gid, r); continue; }
      if (r.locale === locale && cur.locale !== locale) byGroup.set(gid, r);
    }
    return { units: Array.from(byGroup.values()) };
  });

export const getUnitBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().min(1).max(160), locale: z.enum(["en", "es"]).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const locale = data.locale ?? "en";
    const sb = publicClient();
    let { data: unit } = await sb
      .from("learning_units")
      .select("id,slug,locale,title,summary,order_index,translation_group_id")
      .eq("slug", data.slug)
      .eq("locale", locale)
      .eq("status", "published")
      .maybeSingle();
    if (!unit) {
      const r = await sb
        .from("learning_units")
        .select("id,slug,locale,title,summary,order_index,translation_group_id")
        .eq("slug", data.slug)
        .eq("locale", "en")
        .eq("status", "published")
        .maybeSingle();
      unit = r.data ?? null;
    }
    if (!unit) return { unit: null, concepts: [] };
    const { data: concepts } = await sb
      .from("concepts")
      .select("id,title,body_md,order_index,locale")
      .eq("unit_id", unit.id)
      .order("order_index", { ascending: true });
    return { unit, concepts: concepts ?? [] };
  });
