"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { splitWithAnnotations } from "@/lib/lessons/annotate";
import { PassageAnnotation } from "@/components/reading/passage-annotation";
import { cn } from "@/lib/utils";
import type { Annotation, Sentence } from "@/lib/lessons/types";

export function SentenceRow({
  index,
  sentence,
  annotations,
  showAnnotations,
  showSpeaker,
  lessonId,
  cdnBase,
  manifestVersion,
  allSentences,
}: {
  index: number;
  sentence: Sentence;
  annotations: Annotation[];
  showAnnotations: boolean;
  showSpeaker: boolean;
  lessonId: string;
  cdnBase: string;
  manifestVersion: number;
  allSentences: Sentence[];
}) {
  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const currentLessonId = useListeningAudioStore((s) => s.lessonId);
  const status = useListeningAudioStore((s) => s.status);
  const playSingle = useListeningAudioStore((s) => s.playSingle);
  const pause = useListeningAudioStore((s) => s.pause);
  const resume = useListeningAudioStore((s) => s.resume);

  const isActive = currentLessonId === lessonId && currentIndex === index;
  const isPlaying = isActive && status === "playing";
  const isLoading = isActive && status === "loading";

  function handleClick() {
    if (isPlaying) pause();
    else if (isActive && status === "paused") resume();
    else playSingle(lessonId, cdnBase, allSentences, index, manifestVersion);
  }

  const segments = showAnnotations
    ? splitWithAnnotations(sentence.text, annotations)
    : [{ kind: "text" as const, text: sentence.text }];

  return (
    <p
      className={cn(
        "rounded-md px-2 py-1.5 transition-colors",
        isActive && "bg-amber-100/60 dark:bg-amber-900/30",
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={isPlaying ? `Pause sentence ${index + 1}` : `Play sentence ${index + 1}`}
        className="mr-2 inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {isPlaying ? (
          <Pause className="size-3.5" aria-hidden="true" />
        ) : isLoading ? (
          <Volume2 className="size-3.5 animate-pulse" aria-hidden="true" />
        ) : (
          <Play className="size-3.5" aria-hidden="true" />
        )}
      </button>
      {showSpeaker && (
        <span className="mr-1 font-semibold text-foreground">{sentence.speaker}:</span>
      )}
      {segments.map((seg, i) =>
        seg.kind === "text" ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <PassageAnnotation
            key={i}
            text={seg.text}
            annotation={seg.annotation}
            sourceLessonId={lessonId}
          />
        ),
      )}
    </p>
  );
}
