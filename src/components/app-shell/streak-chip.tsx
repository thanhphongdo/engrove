"use client";

import { useStreak } from "@/lib/db/use-streak";

function relativeLastActive(lastActiveDate: string | null): string {
  if (!lastActiveDate) return "never";
  const [y, m, d] = lastActiveDate.split("-").map(Number);
  const lastMidnight = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((todayMidnight - lastMidnight) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/**
 * Compact streak pill for the top app bar (🔥 N). Hidden until a streak exists
 * so a brand-new user sees a clean bar. Streak is derived from reading/listening
 * quiz attempts (see use-streak / computeStreak).
 */
export function StreakChip() {
  const { current, longest, lastActiveDate } = useStreak();
  if (current === 0) return null;

  const tooltip = `Current: ${current} day${current === 1 ? "" : "s"} · Longest: ${longest} · Last study: ${relativeLastActive(lastActiveDate)}`;

  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-sm font-semibold text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400"
    >
      <span aria-hidden="true">🔥</span>
      <span>{current}</span>
      <span className="sr-only">day streak</span>
    </span>
  );
}
