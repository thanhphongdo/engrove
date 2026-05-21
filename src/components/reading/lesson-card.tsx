import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonMeta } from "@/lib/lessons/types";
import type { Attempt } from "@/lib/db/types";
import type { LessonHighlight } from "@/lib/lessons/search-and-sort";
import { BookmarkButton } from "./bookmark-button";
import { HighlightedText } from "./highlighted-text";

const LEVEL_CLASS: Record<LessonMeta["level"], string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

function orderTags(
  tags: readonly string[],
  highlight: LessonHighlight | undefined,
): string[] {
  if (!highlight || highlight.tagRanges.size === 0) return tags.slice();
  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const t of tags) {
    if (highlight.tagRanges.has(t)) matched.push(t);
    else unmatched.push(t);
  }
  return [...matched, ...unmatched];
}

function routeForLesson(id: string): string {
  if (id.startsWith("writing-")) return `/writing/${id}`;
  if (id.startsWith("listening-")) return `/listening/${id}`;
  return `/reading/${id}`;
}

export function LessonCard({
  lesson,
  bestAttempt,
  bestLabel,
  highlight,
}: {
  lesson: LessonMeta;
  bestAttempt?: Attempt;
  /** Optional explicit best-label override (used by /writing). */
  bestLabel?: string;
  highlight?: LessonHighlight;
}) {
  const orderedTags = orderTags(lesson.tags, highlight);
  const visibleTags = orderedTags.slice(0, 3);
  const overflow = orderedTags.length - visibleTags.length;

  const computedLabel =
    bestLabel ??
    (bestAttempt ? `Best ${bestAttempt.score}/${bestAttempt.total}` : null);

  return (
    <div className="group relative rounded-lg border bg-card text-card-foreground transition-shadow hover:shadow-md">
      <Link
        href={routeForLesson(lesson.id)}
        className="block rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
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
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          <HighlightedText text={lesson.summary} ranges={highlight?.summaryRanges} />
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap gap-1 text-muted-foreground">
            {visibleTags.map((t) => (
              <span key={t}>
                #<HighlightedText text={t} ranges={highlight?.tagRanges.get(t)} />
              </span>
            ))}
            {overflow > 0 && <span>+{overflow}</span>}
          </div>
          {computedLabel ? (
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-medium text-secondary-foreground">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              {computedLabel}
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
