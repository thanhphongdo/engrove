const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Counts records completed within the last 7 days (for the hub "N this week" line). */
export function countThisWeek(records: { completedAt: number }[]): number {
  const cutoff = Date.now() - WEEK_MS;
  return records.reduce((n, r) => (r.completedAt >= cutoff ? n + 1 : n), 0);
}
