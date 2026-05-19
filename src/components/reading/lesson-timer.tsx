"use client";

import { useEffect, useState } from "react";
import { Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimerStore } from "@/stores/timer-store";

function format(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function LessonTimer() {
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
    const tick = () => {
      setLiveMs(useTimerStore.getState().elapsedAt(Date.now()));
    };
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [running]);

  const display = running ? liveMs : accumulatedMs;

  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-muted px-2 py-1 font-mono text-sm tabular-nums">
        {format(display)}
      </span>
      {status === "stopped" && (
        <Button type="button" size="sm" onClick={() => begin()}>
          <Play className="mr-1 size-3.5" />
          Begin
        </Button>
      )}
      {status === "running" && (
        <>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => pause()}
          >
            <Pause className="mr-1 size-3.5" />
            Pause
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => finish()}
          >
            <Square className="mr-1 size-3.5" />
            Finish
          </Button>
        </>
      )}
      {status === "paused" && (
        <>
          <Button type="button" size="sm" onClick={() => resume()}>
            <Play className="mr-1 size-3.5" />
            Resume
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => finish()}
          >
            <Square className="mr-1 size-3.5" />
            Finish
          </Button>
        </>
      )}
    </div>
  );
}
