function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return mm > 0 ? `${mm}m ${ss}s` : `${ss}s`;
}

export function ReviewSummary({ score, total, durationMs }: { score: number; total: number; durationMs: number }) {
  const pct = Math.round((score / total) * 100);
  return (
    <div className="rounded-md border bg-secondary/30 p-3 text-sm">
      <p>
        <span className="font-semibold">Result:</span> {score} / {total} ({pct}%)
      </p>
      <p className="text-xs text-muted-foreground">Time on task: {formatDuration(durationMs)}</p>
    </div>
  );
}
