"use client";

import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimerStore } from "@/stores/timer-store";

function format(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function LessonTimer() {
  const running = useTimerStore((s) => s.running);
  const start = useTimerStore((s) => s.start);
  const stop = useTimerStore((s) => s.stop);
  const [, force] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const display = useTimerStore.getState().elapsedAt(Date.now());

  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-muted px-2 py-1 font-mono text-sm tabular-nums">
        {format(display)}
      </span>
      <Button
        type="button"
        size="sm"
        variant={running ? "secondary" : "default"}
        onClick={() => (running ? stop() : start())}
      >
        {running ? <Pause className="mr-1 size-3.5" /> : <Play className="mr-1 size-3.5" />}
        {running ? "Stop" : "Start"}
      </Button>
    </div>
  );
}
