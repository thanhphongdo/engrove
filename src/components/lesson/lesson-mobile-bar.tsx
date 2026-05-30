"use client";

import { Play, Pause, Square } from "lucide-react";
import { useTimerStore } from "@/stores/timer-store";

const PRIMARY =
  "flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900";
const SECONDARY =
  "flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200";

/**
 * Fixed bottom action bar shown only on mobile (md:hidden) — mirrors the
 * mockup's "Begin" bar. Drives the shared lesson timer: Begin → Pause/Finish →
 * Resume/Finish. The page should add bottom padding (pb-28 md:pb-12) to clear it.
 */
export function LessonMobileBar() {
  const status = useTimerStore((s) => s.status);
  const begin = useTimerStore((s) => s.begin);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const finish = useTimerStore((s) => s.finish);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-neutral-900/95 md:hidden">
      {status === "stopped" && (
        <button type="button" onClick={() => begin()} className={PRIMARY}>
          <Play className="size-4" aria-hidden="true" /> Begin
        </button>
      )}
      {status === "running" && (
        <>
          <button type="button" onClick={() => pause()} className={PRIMARY}>
            <Pause className="size-4" aria-hidden="true" /> Pause
          </button>
          <button type="button" onClick={() => finish()} className={SECONDARY}>
            <Square className="size-4" aria-hidden="true" /> Finish
          </button>
        </>
      )}
      {status === "paused" && (
        <>
          <button type="button" onClick={() => resume()} className={PRIMARY}>
            <Play className="size-4" aria-hidden="true" /> Resume
          </button>
          <button type="button" onClick={() => finish()} className={SECONDARY}>
            <Square className="size-4" aria-hidden="true" /> Finish
          </button>
        </>
      )}
    </div>
  );
}
