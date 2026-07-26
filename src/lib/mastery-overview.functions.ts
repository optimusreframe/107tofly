import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_LEVEL } from "./srs";

export type ConceptMastery = {
  id: string;
  title: string;
  level: number;
  maxLevel: number;
  masteryPct: number;
  correctStreak: number;
  lastSeenAt: string | null;
  nextDueAt: string | null;
  status: "new" | "due" | "learning" | "mastered";
};

export type UnitMastery = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  locale: string;
  conceptCount: number;
  seenCount: number;
  dueCount: number;
  masteredCount: number;
  avgMasteryPct: number;
  concepts: ConceptMastery[];
};

export const getMasteryOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ units: UnitMastery[] }> => {
    const { supabase, userId } = context;
    const { data: units } = await supabase
      .from("learning_units")
      .select("id,slug,title,summary,locale,order_index")
      .eq("status", "published")
      .eq("locale", "en")
      .order("order_index", { ascending: true });
    const unitList = units ?? [];
    if (unitList.length === 0) return { units: [] };

    const unitIds = unitList.map((u) => u.id as string);
    const { data: concepts } = await supabase
      .from("concepts")
      .select("id,unit_id,title,order_index")
      .in("unit_id", unitIds)
      .order("order_index", { ascending: true });
    const conceptList = concepts ?? [];
    const conceptIds = conceptList.map((c) => c.id as string);

    const { data: mastery } = conceptIds.length
      ? await supabase
          .from("mastery")
          .select("concept_id,level,correct_streak,last_seen_at,next_due_at")
          .eq("user_id", userId)
          .in("concept_id", conceptIds)
      : { data: [] };
    const mById = new Map<string, {
      level: number; correct_streak: number; last_seen_at: string | null; next_due_at: string | null;
    }>();
    for (const m of mastery ?? []) {
      mById.set(m.concept_id as string, {
        level: Number(m.level ?? 0),
        correct_streak: Number(m.correct_streak ?? 0),
        last_seen_at: (m.last_seen_at as string | null) ?? null,
        next_due_at: (m.next_due_at as string | null) ?? null,
      });
    }

    const nowMs = Date.now();
    const conceptsByUnit = new Map<string, ConceptMastery[]>();
    for (const c of conceptList) {
      const m = mById.get(c.id as string);
      const level = m?.level ?? 0;
      const masteryPct = Math.round((level / MAX_LEVEL) * 100);
      let status: ConceptMastery["status"];
      if (!m) status = "new";
      else if (level >= MAX_LEVEL) status = "mastered";
      else if (m.next_due_at && new Date(m.next_due_at).getTime() <= nowMs) status = "due";
      else status = "learning";
      const arr = conceptsByUnit.get(c.unit_id as string) ?? [];
      arr.push({
        id: c.id as string,
        title: c.title as string,
        level,
        maxLevel: MAX_LEVEL,
        masteryPct,
        correctStreak: m?.correct_streak ?? 0,
        lastSeenAt: m?.last_seen_at ?? null,
        nextDueAt: m?.next_due_at ?? null,
        status,
      });
      conceptsByUnit.set(c.unit_id as string, arr);
    }

    const out: UnitMastery[] = unitList.map((u) => {
      const cs = conceptsByUnit.get(u.id as string) ?? [];
      const seenCount = cs.filter((c) => c.status !== "new").length;
      const dueCount = cs.filter((c) => c.status === "due").length;
      const masteredCount = cs.filter((c) => c.status === "mastered").length;
      const avg = cs.length ? Math.round(cs.reduce((s, c) => s + c.masteryPct, 0) / cs.length) : 0;
      return {
        id: u.id as string,
        slug: u.slug as string,
        title: u.title as string,
        summary: (u.summary as string | null) ?? null,
        locale: u.locale as string,
        conceptCount: cs.length,
        seenCount,
        dueCount,
        masteredCount,
        avgMasteryPct: avg,
        concepts: cs,
      };
    });
    return { units: out };
  });
