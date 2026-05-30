"use client";

import { useMemo, useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DetailCard } from "@/components/lesson/detail-card";
import { splitWithAnnotations } from "@/lib/lessons/annotate";
import { PassageAnnotation } from "@/components/reading/passage-annotation";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SentenceRow } from "./sentence-row";
import type { ListeningLesson } from "@/lib/lessons/types";

/** Number of sentences revealed up-front before the learner listens. */
const INITIAL_REVEALED = 2;

/** Cumulative start offsets (ms) for each sentence, preferring concat offsets. */
function useStartOffsets(lesson: ListeningLesson): number[] {
  const concatOffsetsMs = useListeningAudioStore((s) => s.concatOffsetsMs);
  return useMemo(() => {
    if (concatOffsetsMs.length === lesson.sentences.length) return concatOffsetsMs;
    const out: number[] = [];
    let acc = 0;
    for (const s of lesson.sentences) {
      out.push(acc);
      acc += s.durationMs ?? 0;
    }
    return out;
  }, [concatOffsetsMs, lesson.sentences]);
}

/**
 * Section 2: the sentence timeline. Each row plays its sentence; locked
 * sentences are blurred behind a "Tap to reveal" pill. Sentences unlock as the
 * learner plays through them (or taps to reveal).
 */
export function SentenceTimeline({ lesson }: { lesson: ListeningLesson }) {
  const showSpeaker = lesson.format === "dialogue";
  const startOffsets = useStartOffsets(lesson);

  const currentLessonId = useListeningAudioStore((s) => s.lessonId);
  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const isOurLesson = currentLessonId === lesson.id;

  // Sentences the learner has explicitly tapped to reveal.
  const [tapped, setTapped] = useState<ReadonlySet<number>>(new Set());
  // Furthest sentence reached by playback (everything up to it is revealed).
  // Adjusted during render from the external audio store — the documented React
  // pattern for deriving state from a changing input without an effect.
  const [maxPlayed, setMaxPlayed] = useState(-1);
  if (isOurLesson && currentIndex > maxPlayed) setMaxPlayed(currentIndex);

  function isRevealed(i: number): boolean {
    return i < INITIAL_REVEALED || i <= maxPlayed || tapped.has(i);
  }

  const lockedCount = lesson.sentences.reduce((acc, _s, i) => acc + (isRevealed(i) ? 0 : 1), 0);

  return (
    <DetailCard className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        Sentences · {lesson.sentences.length}
      </h2>
      <div className="divide-y divide-neutral-100 dark:divide-white/5">
        {lesson.sentences.map((s, i) => (
          <SentenceRow
            key={s.id}
            index={i}
            sentence={s}
            startMs={startOffsets[i] ?? 0}
            locked={!isRevealed(i)}
            onReveal={() => setTapped((prev) => (prev.has(i) ? prev : new Set([...prev, i])))}
            showSpeaker={showSpeaker}
            lessonId={lesson.id}
            cdnBase={lesson.audio.cdnBase}
            manifestVersion={lesson.audio.manifestVersion}
            allSentences={lesson.sentences}
          />
        ))}
        {lockedCount > 0 && (
          <p className="px-2 pb-1 pt-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
            … and {lockedCount} more sentence{lockedCount === 1 ? "" : "s"}. Keep listening to unlock them.
          </p>
        )}
      </div>
    </DetailCard>
  );
}

/**
 * Section 5 (left column): the full transcript card. Hidden by default
 * ("Listen first, then reveal") and toggled by the player's "Show transcript"
 * button. Includes inline annotations + an optional Vietnamese translation.
 */
export function TranscriptCard({
  lesson,
  shown,
  showAnnotations,
  showTranslation,
  pinned,
  onTogglePin,
}: {
  lesson: ListeningLesson;
  shown: boolean;
  showAnnotations: boolean;
  showTranslation: boolean;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const showSpeaker = lesson.format === "dialogue";
  const startOffsets = useStartOffsets(lesson);
  const translationLines = lesson.translationVi.split(/\n+/);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Transcript</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onTogglePin}
              aria-pressed={pinned}
              aria-label={pinned ? "Unpin transcript" : "Pin transcript"}
              className={cn(
                "grid size-7 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10 dark:hover:text-neutral-200",
                pinned && "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {pinned ? <PinOff className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {pinned ? "Unpin transcript" : "Pin transcript while scrolling"}
          </TooltipContent>
        </Tooltip>
      </div>

      {!shown ? (
        <p className="text-xs italic text-neutral-400 dark:text-neutral-500">
          Listen first, then reveal the transcript.
        </p>
      ) : (
        <div className={showTranslation ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : ""}>
          <article className="space-y-2.5 text-sm leading-relaxed">
            {lesson.sentences.map((s, i) => {
              const segments = showAnnotations
                ? splitWithAnnotations(s.text, lesson.annotations)
                : [{ kind: "text" as const, text: s.text }];
              return (
                <p key={s.id} className="text-neutral-800 dark:text-neutral-200">
                  <span className="mr-1.5 font-mono text-[0.6875rem] text-neutral-400 dark:text-neutral-500">
                    {formatClock(startOffsets[i] ?? 0)}
                  </span>
                  {showSpeaker && s.speaker && (
                    <span className="mr-1 font-semibold text-neutral-900 dark:text-neutral-100">{s.speaker}:</span>
                  )}
                  {segments.map((seg, idx) =>
                    seg.kind === "text" ? (
                      <span key={idx}>{seg.text}</span>
                    ) : (
                      <PassageAnnotation
                        key={idx}
                        text={seg.text}
                        annotation={seg.annotation}
                        sourceLessonId={lesson.id}
                      />
                    ),
                  )}
                </p>
              );
            })}
          </article>
          {showTranslation && (
            <aside className="space-y-1.5 border-t border-neutral-100 pt-2.5 text-[0.8125rem] italic leading-relaxed text-neutral-400 dark:border-white/5 dark:text-neutral-500 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              {translationLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </aside>
          )}
        </div>
      )}
    </>
  );
}
