import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getPublicLandingSections = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ locale: z.enum(["en", "es"]) }).parse(d))
  .handler(async ({ data }) => {
    const cols = "section_key, locale, title, subtitle, body, cta_label, cta_href, image_url, video_url, content, sort_order";
    const [{ data: localized }, { data: enRows }] = await Promise.all([
      supabaseAdmin.from("landing_sections" as never).select(cols).eq("locale", data.locale).eq("status", "published").order("sort_order", { ascending: true }),
      data.locale === "en"
        ? Promise.resolve({ data: [] as Array<Record<string, unknown>> })
        : supabaseAdmin.from("landing_sections" as never).select(cols).eq("locale", "en").eq("status", "published").order("sort_order", { ascending: true }),
    ]);
    type Row = {
      section_key: string;
      locale: string;
      title: string | null;
      subtitle: string | null;
      body: string | null;
      cta_label: string | null;
      cta_href: string | null;
      image_url: string | null;
      video_url: string | null;
      content: Record<string, object>;
      sort_order: number | null;
      fallback?: boolean;
    };
    const bySection = new Map<string, Row>();
    for (const r of (enRows ?? []) as Row[]) bySection.set(r.section_key, { ...r, fallback: data.locale !== "en" });
    for (const r of (localized ?? []) as Row[]) bySection.set(r.section_key, { ...r, fallback: false });
    const merged = Array.from(bySection.values()).sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
    return { sections: merged };
  });
