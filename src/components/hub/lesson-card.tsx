import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { CefrLevel } from "@/lib/lessons/types";
import type { LessonHighlight } from "@/lib/lessons/search-and-sort";
import { LEVEL_STYLES } from "@/lib/levels";
import { LevelBadge } from "@/components/shared/level-badge";
import { HighlightedText } from "@/components/reading/highlighted-text";
import { BookmarkButton } from "@/components/reading/bookmark-button";

export type CardStatus =
  | { kind: "not-started" }
  | { kind: "in-progress"; label: string; percent?: number }
  | { kind: "complete"; label: string };

type CardLesson = {
  id: string;
  level: CefrLevel;
  title: string;
  summary: string;
  tags: readonly string[];
};

function orderTags(tags: readonly string[], highlight?: LessonHighlight): string[] {
  if (!highlight || highlight.tagRanges.size === 0) return tags.slice();
  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const t of tags) (highlight.tagRanges.has(t) ? matched : unmatched).push(t);
  return [...matched, ...unmatched];
}

/** Default bottom-left content: the lesson's first few tags as #hashtags. */
function TagChips({ lesson, highlight }: { lesson: CardLesson; highlight?: LessonHighlight }) {
  const ordered = orderTags(lesson.tags, highlight);
  const visible = ordered.slice(0, 3);
  const overflow = ordered.length - visible.length;
  return (
    <div className="flex min-w-0 gap-1.5 truncate text-neutral-400">
      {visible.map((t) => (
        <span key={t} className="truncate">
          #<HighlightedText text={t} ranges={highlight?.tagRanges.get(t)} />
        </span>
      ))}
      {overflow > 0 && <span>+{overflow}</span>}
    </div>
  );
}

/**
 * Shared lesson card for every hub. The level accent bar, badge, favorite star,
 * title and summary are identical; the bottom row varies by `status`
 * (not-started / in-progress / complete) and an optional `metaLeft` slot
 * (e.g. listening's duration + accent flag).
 */
export function LessonCard({
  lesson,
  href,
  status,
  highlight,
  metaLeft,
}: {
  lesson: CardLesson;
  href: string;
  status: CardStatus;
  highlight?: LessonHighlight;
  /** Overrides the bottom-left tag chips (used for listening duration/accent). */
  metaLeft?: ReactNode;
}) {
  const left = metaLeft ?? <TagChips lesson={lesson} highlight={highlight} />;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:-translate-y-0.5 dark:border-white/10 dark:bg-neutral-900">
      <span className={cn("absolute inset-y-0 left-0 w-1.5", LEVEL_STYLES[lesson.level].accent)} aria-hidden="true" />
      <Link href={href} className="block p-4 pl-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
        <div className="flex items-start gap-2 pr-7">
          <LevelBadge level={lesson.level} className="mt-0.5" />
          <h3 className="line-clamp-2 min-w-0 flex-1 font-semibold leading-snug">
            <HighlightedText text={lesson.title} ranges={highlight?.titleRanges} />
          </h3>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-neutral-500">
          <HighlightedText text={lesson.summary} ranges={highlight?.summaryRanges} />
        </p>

        {status.kind === "in-progress" && status.percent != null ? (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.max(0, Math.min(100, status.percent))}%` }}
              />
            </div>
            <span className="shrink-0 text-neutral-500">{status.label}</span>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            {left}
            {status.kind === "complete" ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                <Check className="size-3" aria-hidden="true" />
                {status.label}
              </span>
            ) : status.kind === "in-progress" ? (
              <span className="shrink-0 rounded-md bg-sky-100 px-1.5 py-0.5 font-medium text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                {status.label}
              </span>
            ) : (
              <span className="shrink-0 text-neutral-400">Not started</span>
            )}
          </div>
        )}
      </Link>
      <BookmarkButton lessonId={lesson.id} variant="card" />
    </div>
  );
}
