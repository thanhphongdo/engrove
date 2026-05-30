"use client";

import { Clock } from "lucide-react";

export function ResumeBanner({
  onAbandon,
  answered,
  total,
}: {
  onAbandon: () => void;
  answered?: number;
  total?: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-l-4 border-amber-400 bg-neutral-100/60 px-4 py-3 text-sm dark:bg-white/5">
      <span className="inline-flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        <span>
          Resumed your in-progress attempt.
          {answered != null && total != null && (
            <span className="font-semibold"> {answered} of {total} questions answered.</span>
          )}
        </span>
      </span>
      <button
        type="button"
        onClick={onAbandon}
        className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100/60 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/10"
      >
        Abandon and start over
      </button>
    </div>
  );
}
