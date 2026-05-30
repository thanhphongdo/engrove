"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Eye, EyeOff, Pin, PinOff } from "lucide-react";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DetailCard } from "@/components/lesson/detail-card";
import { splitWithAnnotations } from "@/lib/lessons/annotate";
import { PassageAnnotation } from "@/components/reading/passage-annotation";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SentenceRow } from "./sentence-row";
import type { ListeningLesson } from "@/lib/lessons/types";

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
  pinned,
  onToggle,
  onTogglePin,
}: {
  lesson: ListeningLesson;
  shown: boolean;
  showAnnotations: boolean;
  showTranslation: boolean;
  pinned: boolean;
  onToggle: () => void;
  onTogglePin: () => void;
}) {
  const showSpeaker = lesson.format === "dialogue";
  const startOffsets = useStartOffsets(lesson);
  const translationLines = lesson.translationVi.split(/\n+/);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={shown}
          className="-mx-1 inline-flex flex-1 cursor-pointer items-center gap-1.5 rounded-lg px-1 py-0.5 text-left text-sm font-semibold text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-white"
        >
          Transcript
          <ChevronDown
            className={cn("size-4 text-neutral-400 transition-transform", shown && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        {shown && (
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
        )}
      </div>

      {shown && (
        <div className="mt-3 space-y-4">
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
            <aside className="space-y-1.5 border-t border-neutral-100 pt-3 text-[0.8125rem] italic leading-relaxed text-neutral-500 dark:border-white/5 dark:text-neutral-400">
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
