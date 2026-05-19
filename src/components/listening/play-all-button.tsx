"use client";

import { Pause, Play } from "lucide-react";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import type { Sentence } from "@/lib/lessons/types";

function fmtDuration(ms: number | undefined): string {
  if (!ms) return "";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function PlayAllButton({
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
  const status = useListeningAudioStore((s) => s.status);
  const mode = useListeningAudioStore((s) => s.mode);
  const playAll = useListeningAudioStore((s) => s.playAll);
  const pause = useListeningAudioStore((s) => s.pause);
  const resume = useListeningAudioStore((s) => s.resume);

  const isOurLesson = currentLessonId === lessonId;
  const isPlaying = isOurLesson && mode === "playAll" && status === "playing";
  const isPaused = isOurLesson && mode === "playAll" && status === "paused";

  function handleClick() {
    if (isPlaying) pause();
    else if (isPaused) resume();
    else playAll(lessonId, cdnBase, sentences, undefined, manifestVersion);
  }

  const audioPending = totalDurationMs === undefined;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={audioPending}
      className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      {audioPending ? "audio pending" : isPlaying ? "Pause" : `Play all (${fmtDuration(totalDurationMs)})`}
    </button>
  );
}
