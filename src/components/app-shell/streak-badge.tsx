"use client";

import { Flame } from "lucide-react";
import { useStreak } from "@/lib/db/use-streak";

function relativeLastActive(lastActiveDate: string | null): string {
  if (!lastActiveDate) return "never";
  const [y, m, d] = lastActiveDate.split("-").map(Number);
  const lastMidnight = new Date(y, m - 1, d).getTime();
  const todayMidnight = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  ).getTime();
  const days = Math.round((todayMidnight - lastMidnight) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function StreakBadge() {
  const { current, longest, lastActiveDate } = useStreak();
  const tooltip = `Current: ${current} day${current === 1 ? "" : "s"} · Longest: ${longest} · Last study: ${relativeLastActive(lastActiveDate)}`;

  if (current === 0) {
    return (
      <div
        className="rounded-md border bg-background px-2 py-1.5 text-center text-xs text-muted-foreground"
        title={tooltip}
      >
        Start a streak
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center gap-1.5 rounded-md border bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300"
      title={tooltip}
    >
      <Flame className="size-3.5 fill-amber-400 stroke-amber-500" aria-hidden="true" />
      <span>
        {current}-day streak
      </span>
    </div>
  );
}
