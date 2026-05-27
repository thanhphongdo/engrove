"use client";

import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpeakingLessonMeta } from "@/lib/lessons/speaking-schema";
import type { LessonHighlight } from "@/lib/lessons/search-and-sort";
import { BookmarkButton } from "@/components/reading/bookmark-button";
import { HighlightedText } from "@/components/reading/highlighted-text";

const LEVEL_CLASS: Record<SpeakingLessonMeta["level"], string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

function fmtDuration(ms: number | undefined): string {
  if (!ms) return "audio pending";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

type Props = {
  lesson: SpeakingLessonMeta;
  isLearned?: boolean;
  isLearning?: boolean;
  highlight?: LessonHighlight;
};

export function SpeakingLessonCard({ lesson, isLearned, isLearning, highlight }: Props) {
  const visibleTags = lesson.tags.slice(0, 3);
  const overflow = lesson.tags.length - visibleTags.length;

  return (
    <div className="group relative rounded-lg border bg-card text-card-foreground transition-shadow hover:shadow-md">
      <Link
        href={`/speaking/${lesson.id}`}
        className="block rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 pr-8">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            <HighlightedText text={lesson.title} ranges={highlight?.titleRanges} />
          </h3>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[0.7rem] font-semibold",
              LEVEL_CLASS[lesson.level],
            )}
          >
            {lesson.level}
          </span>
        </div>

        {/* Summary */}
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          <HighlightedText text={lesson.summary} ranges={highlight?.summaryRanges} />
        </p>

        {/* Meta row: characters · duration · turns */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3 shrink-0" aria-hidden="true" />
            {lesson.characters.join(" · ")}
          </span>
          {lesson.totalDurationMs ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3 shrink-0" aria-hidden="true" />
              {fmtDuration(lesson.totalDurationMs)}
            </span>
          ) : null}
          <span>{lesson.turnCount} turns</span>
        </div>

        {/* Tags */}
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap gap-1 text-muted-foreground">
            {visibleTags.map((t) => (
              <span key={t}>
                #<HighlightedText text={t} ranges={highlight?.tagRanges.get(t)} />
              </span>
            ))}
            {overflow > 0 && <span>+{overflow}</span>}
          </div>

          {/* Status badge */}
          {isLearned ? (
            <span className="inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 text-[0.7rem] font-medium text-emerald-700 dark:text-emerald-300">
              Learned
            </span>
          ) : isLearning ? (
            <span className="inline-flex items-center rounded bg-sky-500/15 px-1.5 py-0.5 text-[0.7rem] font-medium text-sky-700 dark:text-sky-300">
              Learning
            </span>
          ) : null}
        </div>
      </Link>

      <BookmarkButton lessonId={lesson.id} variant="card" />
    </div>
  );
}
