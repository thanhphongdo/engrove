"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Sentence } from "@/lib/lessons/types";

/**
 * A single row in the sentence timeline: a round play/pause button, the
 * sentence text, and a timestamp. While locked the text is blurred behind a
 * "Tap to reveal" pill and clamped to one line; revealing (tap, play, or
 * "Reveal all") shows the full sentence. The active sentence is highlighted.
 */
export function SentenceRow({
  index,
  sentence,
  startMs,
  locked,
  onReveal,
  showSpeaker,
  lessonId,
  cdnBase,
  manifestVersion,
  allSentences,
}: {
  index: number;
  sentence: Sentence;
  startMs: number;
  locked: boolean;
  onReveal: () => void;
  showSpeaker: boolean;
  lessonId: string;
  cdnBase: string;
  manifestVersion: number;
  allSentences: Sentence[];
}) {
  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const currentLessonId = useListeningAudioStore((s) => s.lessonId);
  const status = useListeningAudioStore((s) => s.status);
  const mode = useListeningAudioStore((s) => s.mode);
  const concatOffsetsMs = useListeningAudioStore((s) => s.concatOffsetsMs);
  const playSingle = useListeningAudioStore((s) => s.playSingle);
  const pause = useListeningAudioStore((s) => s.pause);
  const resume = useListeningAudioStore((s) => s.resume);
  const seekToGlobalMs = useListeningAudioStore((s) => s.seekToGlobalMs);

  const isOurLesson = currentLessonId === lessonId;
  const isActive = isOurLesson && currentIndex === index;
  const isPlayAll = isOurLesson && mode === "playAll";

  // In single mode only
  const isPlaying = isActive && !isPlayAll && status === "playing";
  const isLoading = isActive && !isPlayAll && status === "loading";

  function handlePlay() {
    onReveal();
    if (isPlayAll) {
      const globalMs =
        concatOffsetsMs[index] ??
        allSentences.slice(0, index).reduce((acc, s) => acc + (s.durationMs ?? 0), 0);
      seekToGlobalMs(globalMs);
    } else if (isPlaying) {
      pause();
    } else if (isActive && status === "paused") {
      resume();
    } else {
      playSingle(lessonId, cdnBase, allSentences, index, manifestVersion);
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg py-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-white/5",
        isActive && "bg-amber-50 dark:bg-amber-500/10",
        locked && "opacity-75",
      )}
    >
      <button
        type="button"
        onClick={handlePlay}
        aria-label={
          isPlayAll
            ? `Jump to sentence ${index + 1}`
            : isPlaying
              ? `Pause sentence ${index + 1}`
              : `Play sentence ${index + 1}`
        }
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full transition-colors",
          isActive
            ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30",
        )}
      >
        {isPlaying ? (
          <Pause className="size-3" fill="currentColor" aria-hidden="true" />
        ) : isLoading ? (
          <Volume2 className="size-3 animate-pulse" aria-hidden="true" />
        ) : (
          <Play className="size-3 translate-x-px" fill="currentColor" aria-hidden="true" />
        )}
      </button>

      {locked ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={onReveal}
            aria-label={`Reveal sentence ${index + 1}`}
            className="min-w-0 flex-1 cursor-pointer select-none truncate text-left text-sm leading-relaxed text-transparent blur-sm [text-shadow:0_0_8px_var(--color-neutral-400)] dark:[text-shadow:0_0_8px_var(--color-neutral-500)]"
          >
            {showSpeaker && sentence.speaker ? `${sentence.speaker}: ` : ""}
            {sentence.text}
          </button>
          <button
            type="button"
            onClick={onReveal}
            className="shrink-0 cursor-pointer rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-200 dark:bg-white/10 dark:text-neutral-400 dark:hover:bg-white/15"
          >
            Tap to reveal
          </button>
        </div>
      ) : (
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
          {showSpeaker && sentence.speaker && (
            <span className="mr-1 font-semibold text-neutral-900 dark:text-neutral-100">{sentence.speaker}:</span>
          )}
          {sentence.text}
        </p>
      )}

      <span className="shrink-0 font-mono text-xs text-neutral-400 dark:text-neutral-500">
        {formatClock(startMs)}
      </span>
    </div>
  );
}
