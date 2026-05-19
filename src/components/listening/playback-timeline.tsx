"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import type { Sentence } from "@/lib/lessons/types";

function fmtMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PlaybackTimeline({ sentences }: { sentences: Sentence[] }) {
  const mode = useListeningAudioStore((s) => s.mode);
  const status = useListeningAudioStore((s) => s.status);
  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const audioEl = useListeningAudioStore((s) => s.audioEl);
  const readySet = useListeningAudioStore((s) => s.readySet);
  const inlineBarVisible = useListeningAudioStore((s) => s.inlineBarVisible);
  const pause = useListeningAudioStore((s) => s.pause);
  const resume = useListeningAudioStore((s) => s.resume);
  const seekToGlobalMs = useListeningAudioStore((s) => s.seekToGlobalMs);

  const [currentMs, setCurrentMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMs, setDragMs] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  const offsets = useMemo(() => {
    const result: number[] = [];
    let acc = 0;
    for (const s of sentences) {
      result.push(acc);
      acc += s.durationMs ?? 0;
    }
    return result;
  }, [sentences]);

  const totalMs = useMemo(
    () => sentences.reduce((acc, s) => acc + (s.durationMs ?? 0), 0),
    [sentences],
  );

  // Contiguous buffered duration starting from sentence 0.
  const bufferedMs = useMemo(() => {
    let ms = 0;
    for (let i = 0; i < sentences.length; i++) {
      if (!readySet.has(i)) break;
      ms += sentences[i].durationMs ?? 0;
    }
    return ms;
  }, [sentences, readySet]);

  useEffect(() => {
    if (status === "idle") return;
    function tick() {
      if (audioEl && currentIndex >= 0) {
        setCurrentMs((offsets[currentIndex] ?? 0) + audioEl.currentTime * 1000);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [status, audioEl, currentIndex, offsets]);

  function msFromPointer(clientX: number): number {
    const track = trackRef.current;
    if (!track || totalMs === 0) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * totalMs;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragMs(msFromPointer(e.clientX));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setDragMs(msFromPointer(e.clientX));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const ms = msFromPointer(e.clientX);
    setIsDragging(false);
    if (ms > bufferedMs) return; // Block seek to unbuffered region.
    seekToGlobalMs(ms);
  }

  const displayMs = isDragging ? dragMs : (status === "idle" ? 0 : currentMs);
  const progressPct = totalMs > 0 ? Math.min(100, (displayMs / totalMs) * 100) : 0;
  const bufferedPct = totalMs > 0 ? Math.min(100, (bufferedMs / totalMs) * 100) : 0;

  // Only render when playback is active AND the inline bar has scrolled out of view.
  if (mode !== "playAll" || status === "idle" || totalMs === 0 || inlineBarVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
      <button
        type="button"
        onClick={status === "paused" ? resume : pause}
        aria-label={status === "paused" ? "Resume" : "Pause"}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:opacity-90 active:scale-95"
      >
        {status === "paused" ? (
          <Play className="size-4 translate-x-px" aria-hidden="true" />
        ) : (
          <Pause className="size-4" aria-hidden="true" />
        )}
      </button>

      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={totalMs}
        aria-valuenow={Math.round(displayMs)}
        aria-label="Playback position"
        tabIndex={0}
        className="relative flex h-8 flex-1 cursor-pointer touch-none select-none items-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(e) => {
          const step = totalMs * 0.02;
          if (e.key === "ArrowRight")
            seekToGlobalMs(Math.min(bufferedMs, currentMs + step));
          if (e.key === "ArrowLeft")
            seekToGlobalMs(Math.max(0, currentMs - step));
        }}
      >
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary/20"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow"
          style={{ left: `${progressPct}%` }}
        />
      </div>

      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
        {fmtMs(displayMs)} / {fmtMs(totalMs)}
      </span>
    </div>
  );
}
