"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Pause, Play } from "lucide-react";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Sentence } from "@/lib/lessons/types";

function fmtMs(ms: number): string {
  return formatClock(ms);
}

function fmtDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Waveform bar count is derived from the live container width (see
// InlinePlaybackBar) so a wide player gets more bars and a narrow one fewer —
// roughly one bar per WAVE_PITCH_PX, clamped to a sane range.
const WAVE_PITCH_PX = 6; // target px per bar (≈3px bar + gap) — denser waveform
const WAVE_MIN = 20;
const WAVE_MAX = 280;

// Deterministic pseudo-random bar heights so the waveform looks organic but
// stays stable across re-renders (no layout shift while scrubbing).
function waveHeights(count: number): number[] {
  const out: number[] = [];
  let seed = 1337;
  for (let i = 0; i < count; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    out.push(38 + Math.round((seed / 233280) * 57)); // 38–95%
  }
  return out;
}

const SPEEDS = [1, 1.25, 1.5, 0.75] as const;

/**
 * The "Play all" gapless engine controller. Two visual modes:
 *
 * - Default (compact): a borderless inline scrubber — an idle "Play all" button
 *   that becomes a play/pause + draggable scrubber + time readout. Reused by the
 *   speaking detail page.
 * - Player card (listening): pass `onToggleTranscript` to render the large
 *   round play button, a clickable waveform with a playhead, the time readout, a
 *   speed pill, and a "Show transcript" toggle.
 * - Compact card (speaking): pass `compact` to render the same clickable
 *   waveform + playhead in a smaller "Play all · m:ss / m:ss" row, with a speed
 *   pill but no transcript toggle.
 */
export function InlinePlaybackBar({
  lessonId,
  cdnBase,
  manifestVersion,
  sentences,
  totalDurationMs,
  transcriptShown,
  onToggleTranscript,
  compact = false,
}: {
  lessonId: string;
  cdnBase: string;
  manifestVersion: number;
  sentences: Sentence[];
  totalDurationMs: number | undefined;
  /** When provided, render the listening player-card layout. */
  transcriptShown?: boolean;
  onToggleTranscript?: () => void;
  /** Render the compact waveform card (speaking play-all) — no transcript toggle. */
  compact?: boolean;
}) {
  const cardMode = onToggleTranscript !== undefined || compact;

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
  const [speedIdx, setSpeedIdx] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const waveTrackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const [waveWidth, setWaveWidth] = useState(0);

  // Derive bar count from the measured width (560 is a reasonable pre-measure
  // default so the first paint isn't sparse). Heights are memoised on the count
  // so the bar elements stay referentially stable across playback frames —
  // React then bails out of reconciling them, keeping the RAF loop cheap.
  const waveCount = Math.max(WAVE_MIN, Math.min(WAVE_MAX, Math.round((waveWidth || 560) / WAVE_PITCH_PX)));
  const heights = useMemo(() => waveHeights(waveCount), [waveCount]);
  const baseBars = useMemo(
    () =>
      heights.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-emerald-100 dark:bg-emerald-900"
          style={{ height: `${h}%` }}
        />
      )),
    [heights],
  );
  const playedBars = useMemo(
    () =>
      heights.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-emerald-600 dark:bg-emerald-400"
          style={{ height: `${h}%` }}
        />
      )),
    [heights],
  );

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

  // Track the waveform's width so the bar count adapts to the container.
  useEffect(() => {
    const el = waveTrackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWaveWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // Apply the chosen playback rate to the live element (card mode only). Read
  // the element imperatively so we're not mutating a hook-returned binding, and
  // re-apply when the track swaps (playbackRate resets on src change).
  useEffect(() => {
    if (!cardMode) return;
    const el = useListeningAudioStore.getState().audioEl;
    if (el) el.playbackRate = SPEEDS[speedIdx];
  }, [cardMode, speedIdx, status, concatUrl]);

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

  const displayMs = isDragging ? dragMs : isActive ? currentMs : 0;
  const progressPct = totalMs > 0 ? Math.min(100, (displayMs / totalMs) * 100) : 0;
  const bufferedPct = totalMs > 0 ? Math.min(100, (bufferedMs / totalMs) * 100) : 0;
  const audioPending = totalDurationMs === undefined;

  // ── Listening player-card layout ──
  if (cardMode) {
    function handleMainButton() {
      if (!isActive) {
        playAll(lessonId, cdnBase, sentences, undefined, manifestVersion);
      } else if (isPlaying) {
        pause();
      } else {
        resume();
      }
    }

    return (
      <div
        className={cn(
          compact
            ? "flex w-full items-center gap-3"
            : "flex flex-col items-center gap-4 sm:flex-row sm:gap-5",
        )}
      >
        {/* Play/pause button — smaller in the compact (speaking) variant */}
        <button
          type="button"
          onClick={handleMainButton}
          disabled={audioPending}
          aria-label={isPlaying ? "Pause" : "Play all"}
          className={cn(
            "grid shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow transition-transform hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400",
            compact ? "size-10" : "size-16 shadow-lg",
          )}
        >
          {isPlaying ? (
            <Pause className={compact ? "size-4" : "size-7"} fill="currentColor" aria-hidden="true" />
          ) : (
            <Play
              className={cn("translate-x-0.5", compact ? "size-4" : "size-7")}
              fill="currentColor"
              aria-hidden="true"
            />
          )}
        </button>

        <div ref={barRef} className={cn("flex flex-col", compact ? "min-w-0 flex-1 gap-1" : "w-full gap-2")}>
          {/* Waveform / progress bar row — tinted track, clickable + draggable */}
          <div
            role="slider"
            aria-valuemin={0}
            aria-valuemax={totalMs}
            aria-valuenow={Math.round(displayMs)}
            aria-label="Playback position"
            tabIndex={0}
            onPointerDown={isActive ? handlePointerDown : undefined}
            onPointerMove={isActive ? handlePointerMove : undefined}
            onPointerUp={isActive ? handlePointerUp : undefined}
            onPointerCancel={isActive ? handlePointerUp : undefined}
            onKeyDown={(e) => {
              if (!isActive) return;
              const step = totalMs * 0.02;
              if (e.key === "ArrowRight") seekToGlobalMs(Math.min(bufferedMs, currentMs + step));
              if (e.key === "ArrowLeft") seekToGlobalMs(Math.max(0, currentMs - step));
            }}
            className={cn(
              "relative touch-none select-none overflow-hidden rounded-lg bg-neutral-100/60 dark:bg-white/5",
              compact ? "h-7 bg-transparent dark:bg-transparent" : "h-10",
              isActive && "cursor-pointer",
            )}
          >
            {/* Base (unplayed) waveform — spans the full width so each bar's
                position maps directly to its playback position. */}
            <div ref={waveTrackRef} className="flex h-full items-end justify-between gap-px px-2">
              {baseBars}
            </div>
            {/* Played overlay — identical bars, clipped to the live position so
                the green fill edge always sits exactly under the playhead. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 flex h-full items-end justify-between gap-px px-2"
              style={{ clipPath: `inset(0 ${100 - progressPct}% 0 0)` }}
            >
              {playedBars}
            </div>
            {/* Playhead marker */}
            {isActive && (
              <div className="absolute bottom-0 top-0 flex items-center" style={{ left: `${progressPct}%` }}>
                <div className="h-full w-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              </div>
            )}
          </div>

          {/* Time + controls row */}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "font-mono tabular-nums text-neutral-500 dark:text-neutral-400",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {audioPending
                ? "audio pending"
                : `${compact ? "Play all · " : ""}${formatClock(displayMs)} / ${formatClock(totalMs)}`}
            </span>
            <div className="flex items-center gap-2">
              {/* Speed pill */}
              <button
                type="button"
                onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
                aria-label="Playback speed"
                className="rounded-full bg-neutral-200/70 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/15"
              >
                {SPEEDS[speedIdx].toFixed(SPEEDS[speedIdx] % 1 === 0 ? 1 : 2)}×
              </button>
              {/* Show / hide transcript (listening only) */}
              {onToggleTranscript && (
                <button
                  type="button"
                  onClick={onToggleTranscript}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-white/10"
                >
                  <FileText className="size-3.5" aria-hidden="true" />
                  {transcriptShown ? "Hide transcript" : "Show transcript"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Default compact inline scrubber (speaking) ──
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
              if (e.key === "ArrowRight") seekToGlobalMs(Math.min(bufferedMs, currentMs + step));
              if (e.key === "ArrowLeft") seekToGlobalMs(Math.max(0, currentMs - step));
            }}
          >
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
              {/* Buffered region — lighter tint under the played fill */}
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary/20" style={{ width: `${bufferedPct}%` }} />
              {/* Played region */}
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
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
