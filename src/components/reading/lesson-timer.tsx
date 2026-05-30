"use client";

import { useEffect, useState } from "react";
import { Play, Pause, Square, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimerStore } from "@/stores/timer-store";

function format(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const PRIMARY =
  "inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100";
const SECONDARY =
  "inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200";

/**
 * Lesson timer chip + controls, styled to the mockup toolbar.
 * `compactOnMobile` hides the action buttons below md (the mobile bottom bar
 * owns Begin/Pause/Resume there); the time chip always shows.
 */
export function LessonTimer({ compactOnMobile = false }: { compactOnMobile?: boolean }) {
  const status = useTimerStore((s) => s.status);
  const begin = useTimerStore((s) => s.begin);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const finish = useTimerStore((s) => s.finish);
  const accumulatedMs = useTimerStore((s) => s.accumulatedMs);
  const [liveMs, setLiveMs] = useState(0);

  const running = status === "running";

  useEffect(() => {
    if (!running) return;
    const tick = () => setLiveMs(useTimerStore.getState().elapsedAt(Date.now()));
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [running]);

  const display = running ? liveMs : accumulatedMs;

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 font-mono text-sm tabular-nums text-neutral-600 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300">
        <Clock className="size-3.5" aria-hidden="true" />
        {format(display)}
      </span>
      <div className={cn("flex items-center gap-2", compactOnMobile && "hidden md:flex")}>
        {status === "stopped" && (
          <button type="button" onClick={() => begin()} className={PRIMARY}>
            <Play className="size-3.5" aria-hidden="true" /> Begin
          </button>
        )}
        {status === "running" && (
          <>
            <button type="button" onClick={() => pause()} className={SECONDARY}>
              <Pause className="size-3.5" aria-hidden="true" /> Pause
            </button>
            <button type="button" onClick={() => finish()} className={SECONDARY}>
              <Square className="size-3.5" aria-hidden="true" /> Finish
            </button>
          </>
        )}
        {status === "paused" && (
          <>
            <button type="button" onClick={() => resume()} className={PRIMARY}>
              <Play className="size-3.5" aria-hidden="true" /> Resume
            </button>
            <button type="button" onClick={() => finish()} className={SECONDARY}>
              <Square className="size-3.5" aria-hidden="true" /> Finish
            </button>
          </>
        )}
      </div>
    </div>
  );
}
