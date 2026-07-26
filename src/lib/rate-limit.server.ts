// Simple DB-backed sliding-window rate limiter for authenticated server fns.
// Uses `session_events` as the append-only log (already RLS-scoped to user).
// Workers are stateless, so we cannot use in-memory counters reliably.

import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitOpts = {
  /** window size in seconds */
  windowSec: number;
  /** max events allowed within the window */
  max: number;
  /** session_events.kind values to count */
  kinds: Array<"answer" | "feedback" | "start" | "end">;
};

/**
 * Throws a 429 Response when the caller exceeds the configured limit.
 * Uses head+count for a single round-trip.
 */
export async function enforceRateLimit(
  supabase: SupabaseClient,
  userId: string,
  opts: RateLimitOpts,
): Promise<void> {
  const since = new Date(Date.now() - opts.windowSec * 1000).toISOString();
  const { count, error } = await supabase
    .from("session_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("kind", opts.kinds)
    .gte("created_at", since);
  if (error) return; // fail-open on read error, do not block learning
  if ((count ?? 0) >= opts.max) {
    throw new Response("Rate limit exceeded. Please slow down.", { status: 429 });
  }
}
