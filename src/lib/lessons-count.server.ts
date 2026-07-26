// Canonical count of published lessons — deduplicated by slug across locales.
// Replaces the hardcoded literal "28" that used to leak into readiness,
// achievements, certificates, and progress calculations.

type SB = { from: (t: string) => any };

export async function countCanonicalPublishedLessons(supabase: SB): Promise<number> {
  const { data, error } = await supabase
    .from("lessons")
    .select("slug")
    .eq("status", "published");
  if (error) return 0;
  const slugs = new Set<string>();
  for (const r of (data ?? []) as Array<{ slug: string }>) {
    if (r.slug) slugs.add(r.slug);
  }
  return slugs.size;
}
