"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { DetailCard } from "@/components/lesson/detail-card";
import { Passage } from "@/components/reading/passage";
import { cn } from "@/lib/utils";
import { SentenceRow } from "./sentence-row";
import type { ListeningLesson, Lesson } from "@/lib/lessons/types";

/** Sentences revealed up-front before the learner plays or taps to reveal. */
const INITIAL_REVEALED = 2;
/** Sentences shown before the learner expands the full list. */
const COLLAPSED_COUNT = 3;

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
 * Section 2: the sentence timeline. Two independent axes:
 *  - Reveal (listen-first blur): sentences start blurred behind "Tap to reveal";
 *    they unblur as the learner plays through, taps a row, or hits "Reveal all".
 *  - Collapse (row count): the list shows the first few sentences and expands to
 *    the full set on demand. This has nothing to do with the reveal state.
 */
export function SentenceTimeline({ lesson }: { lesson: ListeningLesson }) {
  const showSpeaker = lesson.format === "dialogue";
  const startOffsets = useStartOffsets(lesson);

  const currentLessonId = useListeningAudioStore((s) => s.lessonId);
  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const isOurLesson = currentLessonId === lesson.id;

  // Reveal axis — listen-first blur, independent from the collapse below.
  const [tapped, setTapped] = useState<ReadonlySet<number>>(new Set());
  const [revealAll, setRevealAll] = useState(false);
  // Furthest sentence reached by playback, derived from the store during render.
  const [maxPlayed, setMaxPlayed] = useState(-1);
  if (isOurLesson && currentIndex > maxPlayed) setMaxPlayed(currentIndex);

  const isRevealed = (i: number) =>
    revealAll || i < INITIAL_REVEALED || i <= maxPlayed || tapped.has(i);

  // Collapse axis — how many rows render.
  const [expanded, setExpanded] = useState(false);

  const total = lesson.sentences.length;
  const canCollapse = total > COLLAPSED_COUNT;
  const visible = expanded || !canCollapse ? lesson.sentences : lesson.sentences.slice(0, COLLAPSED_COUNT);

  return (
    <DetailCard className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          Sentences · {total}
        </h2>
        <button
          type="button"
          onClick={() => setRevealAll((v) => !v)}
          aria-pressed={revealAll}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          {revealAll ? (
            <EyeOff className="size-3.5" aria-hidden="true" />
          ) : (
            <Eye className="size-3.5" aria-hidden="true" />
          )}
          {revealAll ? "Hide all" : "Reveal all"}
        </button>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-white/5">
        {visible.map((s, i) => (
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
      </div>
      {canCollapse && (
        <div className="mt-1 flex justify-center border-t border-neutral-100 pt-3 dark:border-white/5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
          >
            {expanded ? "Show less" : `Show all ${total} sentences`}
            <ChevronDown
              className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </DetailCard>
  );
}

/**
 * Section 5 (left column): the full transcript card. A plain collapsible
 * section — open it whenever you like (no "listen first" gate), collapsed by
 * default. Includes inline annotations + an optional Vietnamese translation.
 */
export function TranscriptCard({
  lesson,
  shown,
  showAnnotations,
  showTranslation,
  onToggle,
}: {
  lesson: ListeningLesson;
  shown: boolean;
  showAnnotations: boolean;
  showTranslation: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={shown}
        className="-mx-1 flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-1 py-0.5 text-left text-sm font-semibold text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-white"
      >
        Transcript
        <ChevronDown
          className={cn("size-4 text-neutral-400 transition-transform", shown && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {shown && (
        // The transcript shares the reading Passage renderer: each English
        // turn/paragraph is followed directly by its Vietnamese (no far block),
        // with the same inline-annotation popovers.
        <div className="mt-3 text-sm">
          <Passage
            lesson={lesson as Lesson}
            showAnnotations={showAnnotations}
            showTranslation={showTranslation}
            heading={null}
          />
        </div>
      )}
    </>
  );
}
