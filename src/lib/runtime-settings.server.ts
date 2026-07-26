// Server-only: central runtime reader for app_settings with cache + safe fallbacks.
// Never expose admin-only settings to client. Use the public functions wrapper for that.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const SETTING_DEFAULTS = {
  // study / gamification
  "study.lesson_completion_xp": 15,
  "study.lesson_quiz_pass_xp": 20,
  "study.quiz_pass_score": 70,
  "study.exam_pass_score": 70,
  "study.exam_ready_score": 85,
  "study.level_xp_step": 400,
  "study.daily_goal_minutes": 120,
  // certificate
  "certificate.min_course_completion_percent": 100,
  "certificate.min_quiz_average": 80,
  "certificate.required_exam_simulations": 2,
  "certificate.min_latest_exam_score": 85,
  "certificate.estimated_hours": 56,
  "certificate.disclaimer_en":
    "This 107toFly certificate is internal and does not replace the FAA Remote Pilot Certificate.",
  "certificate.disclaimer_es":
    "Este certificado de 107toFly es interno y no reemplaza al Remote Pilot Certificate de la FAA.",
  "certificate.template_style": "premium",
  // features
  "features.flycoach_enabled": true,
  "features.certificates_enabled": true,
  "features.pwa_enabled": true,
  "features.maintenance_mode": false,
  "features.payments_enabled": false,
  "features.media_uploads_enabled": false,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

const PUBLIC_KEYS: SettingKey[] = [
  "study.quiz_pass_score",
  "study.exam_pass_score",
  "study.exam_ready_score",
  "study.level_xp_step",
  "study.daily_goal_minutes",
  "certificate.min_course_completion_percent",
  "certificate.min_quiz_average",
  "certificate.required_exam_simulations",
  "certificate.min_latest_exam_score",
  "certificate.estimated_hours",
  "certificate.disclaimer_en",
  "certificate.disclaimer_es",
  "certificate.template_style",
  "features.flycoach_enabled",
  "features.certificates_enabled",
  "features.pwa_enabled",
  "features.maintenance_mode",
  "features.payments_enabled",
  "features.media_uploads_enabled",
];

const CACHE_TTL_MS = 30_000;
let cache: { at: number; map: Map<string, unknown> } | null = null;

async function loadAll(): Promise<Map<string, unknown>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.map;
  const map = new Map<string, unknown>();
  try {
    const { data } = await supabaseAdmin.from("app_settings").select("key,value");
    for (const r of data ?? []) map.set(r.key as string, (r as { value: unknown }).value);
  } catch (e) {
    console.error("[runtime-settings] load failed; using defaults", e);
  }
  cache = { at: Date.now(), map };
  return map;
}

export function invalidateSettingsCache() { cache = null; }

function coerce<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof fallback === "number") {
    const n = typeof raw === "number" ? raw : Number(raw);
    return (Number.isFinite(n) ? n : fallback) as T;
  }
  if (typeof fallback === "boolean") {
    if (typeof raw === "boolean") return raw as T;
    if (raw === "true" || raw === 1) return true as T;
    if (raw === "false" || raw === 0) return false as T;
    return fallback;
  }
  if (typeof fallback === "string") {
    return (typeof raw === "string" ? raw : String(raw)) as T;
  }
  return raw as T;
}

export async function getSettingValue<K extends SettingKey>(
  key: K,
): Promise<typeof SETTING_DEFAULTS[K]>;
export async function getSettingValue<T>(key: string, fallback: T): Promise<T>;
export async function getSettingValue(key: string, fallback?: unknown): Promise<unknown> {
  const fb = (fallback !== undefined ? fallback : (SETTING_DEFAULTS as Record<string, unknown>)[key]);
  const map = await loadAll();
  return coerce(map.get(key), fb);
}

export async function getRuntimeSettings(): Promise<typeof SETTING_DEFAULTS> {
  const map = await loadAll();
  const out = { ...SETTING_DEFAULTS } as Record<string, unknown>;
  for (const k of Object.keys(SETTING_DEFAULTS)) {
    out[k] = coerce(map.get(k), (SETTING_DEFAULTS as Record<string, unknown>)[k]);
  }
  return out as typeof SETTING_DEFAULTS;
}

export async function getStudySettings() {
  const s = await getRuntimeSettings();
  return {
    lessonCompletionXp: s["study.lesson_completion_xp"],
    lessonQuizPassXp: s["study.lesson_quiz_pass_xp"],
    quizPassScore: s["study.quiz_pass_score"],
    examPassScore: s["study.exam_pass_score"],
    examReadyScore: s["study.exam_ready_score"],
    levelXpStep: s["study.level_xp_step"],
    dailyGoalMinutes: s["study.daily_goal_minutes"],
  };
}

export async function getCertificateSettings() {
  const s = await getRuntimeSettings();
  return {
    minCourseCompletionPercent: s["certificate.min_course_completion_percent"],
    minQuizAverage: s["certificate.min_quiz_average"],
    requiredExamSimulations: s["certificate.required_exam_simulations"],
    minLatestExamScore: s["certificate.min_latest_exam_score"],
    estimatedHours: s["certificate.estimated_hours"],
    disclaimerEn: s["certificate.disclaimer_en"],
    disclaimerEs: s["certificate.disclaimer_es"],
    templateStyle: s["certificate.template_style"],
  };
}

export async function getFeatureFlags() {
  const s = await getRuntimeSettings();
  return {
    flycoachEnabled: s["features.flycoach_enabled"],
    certificatesEnabled: s["features.certificates_enabled"],
    pwaEnabled: s["features.pwa_enabled"],
    maintenanceMode: s["features.maintenance_mode"],
    paymentsEnabled: s["features.payments_enabled"],
    mediaUploadsEnabled: s["features.media_uploads_enabled"],
  };
}

export async function getPublicRuntimeSnapshot() {
  const s = await getRuntimeSettings();
  const out: Record<string, unknown> = {};
  for (const k of PUBLIC_KEYS) out[k] = s[k];
  return out;
}

export const RUNTIME_CONNECTED_KEYS: string[] = [
  "study.lesson_completion_xp",
  "study.lesson_quiz_pass_xp",
  "study.quiz_pass_score",
  "study.exam_pass_score",
  "study.exam_ready_score",
  "study.level_xp_step",
  "study.daily_goal_minutes",
  "certificate.min_course_completion_percent",
  "certificate.min_quiz_average",
  "certificate.required_exam_simulations",
  "certificate.min_latest_exam_score",
  "certificate.estimated_hours",
  "certificate.disclaimer_en",
  "certificate.disclaimer_es",
  "certificate.template_style",
  "features.flycoach_enabled",
  "features.certificates_enabled",
  "features.maintenance_mode",
];
