import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListeningLessonMeta } from "@/lib/lessons/types";
import type { Attempt } from "@/lib/db/types";
import type { LessonHighlight } from "@/lib/lessons/search-and-sort";
import { BookmarkButton } from "@/components/reading/bookmark-button";
import { HighlightedText } from "@/components/reading/highlighted-text";
import { AccentFlag } from "@/components/ui/accent-flag";

const LEVEL_CLASS: Record<ListeningLessonMeta["level"], string> = {
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

export function ListeningLessonCard({
  lesson,
  bestAttempt,
  highlight,
}: {
  lesson: ListeningLessonMeta;
  bestAttempt?: Attempt;
  highlight?: LessonHighlight;
}) {
  const visibleTags = lesson.tags.slice(0, 3);
  const overflow = lesson.tags.length - visibleTags.length;
  return (
    <div className="group relative rounded-lg border bg-card text-card-foreground transition-shadow hover:shadow-md">
      <Link
        href={`/listening/${lesson.id}`}
        className="block rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start justify-between gap-2 pr-8">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            <HighlightedText text={lesson.title} ranges={highlight?.titleRanges} />
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <AccentFlag accents={lesson.accents} />
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[0.7rem] font-semibold",
                LEVEL_CLASS[lesson.level],
              )}
            >
              {lesson.level}
            </span>
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          <HighlightedText text={lesson.summary} ranges={highlight?.summaryRanges} />
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3" aria-hidden="true" />
          <span>{fmtDuration(lesson.totalDurationMs)}</span>
          <span>·</span>
          <span>{lesson.sentenceCount} sentences</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap gap-1 text-muted-foreground">
            {visibleTags.map((t) => (
              <span key={t}>
                #<HighlightedText text={t} ranges={highlight?.tagRanges.get(t)} />
              </span>
            ))}
            {overflow > 0 && <span>+{overflow}</span>}
          </div>
          {bestAttempt ? (
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-medium text-secondary-foreground">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              Best {bestAttempt.score}/{bestAttempt.total}
            </span>
          ) : (
            <span className="text-muted-foreground">Not started</span>
          )}
        </div>
      </Link>
      <BookmarkButton lessonId={lesson.id} variant="card" />
    </div>
  );
}
