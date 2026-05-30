function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return mm > 0 ? `${mm}m ${ss}s` : `${ss}s`;
}

/**
 * Render the post-submit score panel.
 *
 * When clozeTotal is null or 0 the lesson had no cloze quiz; render a single
 * "Result" line. Otherwise break the score out into MC, Cloze, and Total.
 */
export function ReviewSummary({
  mcScore,
  mcTotal,
  clozeScore,
  clozeTotal,
  durationMs,
}: {
  mcScore: number;
  mcTotal: number;
  clozeScore: number | null;
  clozeTotal: number | null;
  durationMs: number;
}) {
  const hasCloze = clozeScore !== null && clozeTotal !== null && clozeTotal > 0;
  const total = mcTotal + (clozeTotal ?? 0);
  const score = mcScore + (clozeScore ?? 0);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="rounded-xl bg-neutral-100/60 p-4 text-sm dark:bg-white/5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-neutral-700 dark:text-neutral-200">Your score</span>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
          {score} / {total} · {pct}%
        </span>
      </div>
      {hasCloze && (
        <div className="mt-2 flex gap-4 border-t border-neutral-200/70 pt-2 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">
          <span>Multiple choice: <span className="font-medium text-neutral-700 dark:text-neutral-200">{mcScore}/{mcTotal}</span></span>
          <span>Cloze: <span className="font-medium text-neutral-700 dark:text-neutral-200">{clozeScore}/{clozeTotal}</span></span>
        </div>
      )}
      <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">Time on task: {formatDuration(durationMs)}</p>
    </div>
  );
}
