// Spaced-repetition scheduler (SM-2 lite).
// Interval per level in minutes. Level clamps to [0, MAX_LEVEL].
export const SRS_INTERVALS_MIN = [10, 60, 360, 1440, 4320, 10080] as const;
export const MAX_LEVEL = SRS_INTERVALS_MIN.length - 1;

export function nextLevel(current: number, correct: boolean): number {
  const c = Math.max(0, Math.min(MAX_LEVEL, Math.floor(current)));
  if (correct) return Math.min(MAX_LEVEL, c + 1);
  return Math.max(0, c - 1);
}

export function nextDueAt(level: number, from: Date = new Date()): Date {
  const l = Math.max(0, Math.min(MAX_LEVEL, Math.floor(level)));
  const minutes = SRS_INTERVALS_MIN[l];
  return new Date(from.getTime() + minutes * 60_000);
}
