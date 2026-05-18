import type { Attempt } from "./db/types";

export type StreakSummary = {
  current: number;
  longest: number;
  /** YYYY-MM-DD of the most recent study day, or null if none. */
  lastActiveDate: string | null;
};

/** Local-date YYYY-MM-DD from an epoch-ms timestamp. */
function toLocalDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Subtract `days` from the local-date string and return a new YYYY-MM-DD. */
function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Local midnight; daylight saving transitions don't shift the displayed date.
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Compute streak summary from a list of attempts.
 *
 * Rules:
 * - Study day = local-midnight day on which at least one attempt was completed.
 * - Current streak starts at TODAY if a study day; otherwise at YESTERDAY
 *   (so a learner who studied yesterday but not yet today still sees the streak).
 *   Walks backward by one day; stops at the first missing day.
 * - Longest streak is the longest consecutive run of study days across all time.
 */
export function computeStreak(attempts: Attempt[], now = Date.now()): StreakSummary {
  if (attempts.length === 0) {
    return { current: 0, longest: 0, lastActiveDate: null };
  }

  const studyDays = new Set<string>();
  for (const a of attempts) studyDays.add(toLocalDate(a.completedAt));
  const sortedDescending = Array.from(studyDays).sort().reverse();
  const lastActiveDate = sortedDescending[0];

  // Current streak
  const today = toLocalDate(now);
  let cursor = studyDays.has(today) ? today : shiftDate(today, -1);
  let current = 0;
  while (studyDays.has(cursor)) {
    current += 1;
    cursor = shiftDate(cursor, -1);
  }

  // Longest streak (scan ascending so we can walk forward in time)
  const sortedAscending = Array.from(studyDays).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sortedAscending) {
    if (prev === null || shiftDate(prev, 1) === d) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest, lastActiveDate };
}
