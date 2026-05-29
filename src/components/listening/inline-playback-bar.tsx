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

function fmtDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function InlinePlaybackBar({
  lessonId,
  cdnBase,
  manifestVersion,
  sentences,
  totalDurationMs,
}: {
  lessonId: string;
  cdnBase: string;
  manifestVersion: number;
  sentences: Sentence[];
  totalDurationMs: number | undefined;
}) {
  const currentLessonId = useListeningAudioStore((s) => s.lessonId);
  const mode = useListeningAudioStore((s) => s.mode);
  const status = useListeningAudioStore((s) => s.status);
  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const audioEl = useListeningAudioStore((s) => s.audioEl);
  const readySet = useListeningAudioStore((s) => s.readySet);
  const concatUrl = useListeningAudioStore((s) => s.concatUrl);
  const concatTotalMs = useListeningAudioStore((s) => s.concatTotalMs);
  const playAll = useListeningAudioStore((s) => s.playAll);
  const pause = useListeningAudioStore((s) => s.pause);
  const resume = useListeningAudioStore((s) => s.resume);
  const seekToGlobalMs = useListeningAudioStore((s) => s.seekToGlobalMs);
  const setInlineBarVisible = useListeningAudioStore((s) => s.setInlineBarVisible);

  const [currentMs, setCurrentMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMs, setDragMs] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  const isOurLesson = currentLessonId === lessonId;
  const isActive = isOurLesson && mode === "playAll" && status !== "idle";
  // Treat "loading" (sentence transition) as playing so the button never flickers.
  const isPlaying = isActive && status !== "paused";

  // Report visibility to store — bottom PlaybackTimeline shows when this is false.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInlineBarVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      setInlineBarVisible(true); // Reset on unmount so the next lesson starts clean.
    };
  }, [setInlineBarVisible]);

  // The gapless single-track engine drives Play all when its track is ready.
  const concatActive = !!concatUrl;

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
    () =>
      concatActive && concatTotalMs
        ? concatTotalMs
        : sentences.reduce((acc, s) => acc + (s.durationMs ?? 0), 0),
    [concatActive, concatTotalMs, sentences],
  );

  // RAF loop — keep scrub position in sync with the live audio element.
  // Concat track: currentTime is already the global position. Per-sentence
  // fallback: add the current sentence's start offset.
  useEffect(() => {
    if (!isActive) return;
    function tick() {
      if (audioEl) {
        setCurrentMs(
          concatActive
            ? audioEl.currentTime * 1000
            : currentIndex >= 0
              ? (offsets[currentIndex] ?? 0) + audioEl.currentTime * 1000
              : 0,
        );
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, audioEl, currentIndex, offsets, concatActive]);

  // Concat track is a fully-local blob → entirely seekable. Per-sentence
  // fallback: contiguous buffered duration from sentence 0.
  const bufferedMs = useMemo(() => {
    if (concatActive) return totalMs;
    let ms = 0;
    for (let i = 0; i < sentences.length; i++) {
      if (!readySet.has(i)) break;
      ms += sentences[i].durationMs ?? 0;
    }
    return ms;
  }, [concatActive, totalMs, sentences, readySet]);

  function msFromPointer(clientX: number, el: HTMLElement): number {
    const rect = el.getBoundingClientRect();
    if (totalMs === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * totalMs;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragMs(msFromPointer(e.clientX, e.currentTarget));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setDragMs(msFromPointer(e.clientX, e.currentTarget));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const ms = msFromPointer(e.clientX, e.currentTarget);
    setIsDragging(false);
    if (ms > bufferedMs) return; // Block seek to unbuffered region.
    seekToGlobalMs(ms);
  }

  const displayMs = isDragging ? dragMs : (isActive ? currentMs : 0);
  const progressPct = totalMs > 0 ? Math.min(100, (displayMs / totalMs) * 100) : 0;
  const bufferedPct = totalMs > 0 ? Math.min(100, (bufferedMs / totalMs) * 100) : 0;
  const audioPending = totalDurationMs === undefined;

  return (
    <div ref={barRef} className="flex min-w-0 flex-1 items-center gap-2">
      {!isActive ? (
        <button
          type="button"
          aria-label={audioPending ? "audio pending" : `Play all ${fmtDuration(totalDurationMs!)}`}
          onClick={() => playAll(lessonId, cdnBase, sentences, undefined, manifestVersion)}
          disabled={audioPending}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="size-3.5" />
          {audioPending ? "audio pending" : `Play all (${fmtDuration(totalDurationMs!)})`}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={isPlaying ? pause : resume}
            aria-label={isPlaying ? "Pause" : "Resume"}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:opacity-90 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="size-3.5" aria-hidden="true" />
            ) : (
              <Play className="size-3.5 translate-x-px" aria-hidden="true" />
            )}
          </button>

          <div
            role="slider"
            aria-valuemin={0}
            aria-valuemax={totalMs}
            aria-valuenow={Math.round(displayMs)}
            aria-label="Playback position"
            tabIndex={0}
            className="relative flex h-7 flex-1 cursor-pointer touch-none select-none items-center"
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
              {/* Buffered region — lighter tint under the played fill */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary/20"
                style={{ width: `${bufferedPct}%` }}
              />
              {/* Played region */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {/* Drag handle */}
            <div
              className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow"
              style={{ left: `${progressPct}%` }}
            />
          </div>

          <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
            {fmtMs(displayMs)} / {fmtMs(totalMs)}
          </span>
        </>
      )}
    </div>
  );
}
