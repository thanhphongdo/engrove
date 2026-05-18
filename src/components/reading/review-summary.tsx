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
    <div className="rounded-md border bg-secondary/30 p-3 text-sm">
      {hasCloze ? (
        <>
          <p>
            <span className="font-semibold">Multiple choice:</span> {mcScore} / {mcTotal}
          </p>
          <p>
            <span className="font-semibold">Cloze:</span> {clozeScore} / {clozeTotal}
          </p>
          <p className="mt-1 border-t pt-1">
            <span className="font-semibold">Total:</span> {score} / {total} ({pct}%)
          </p>
        </>
      ) : (
        <p>
          <span className="font-semibold">Result:</span> {score} / {total} ({pct}%)
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Time on task: {formatDuration(durationMs)}
      </p>
    </div>
  );
}
