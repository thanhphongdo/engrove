"use client";

import { Suspense, useMemo } from "react";
import { Clock } from "lucide-react";
import { useListeningLessonsIndex } from "@/lib/lessons/load";
import { useDefaultBestAttempts } from "@/lib/db/use-best-attempts";
import { useBookmarks } from "@/lib/db/use-bookmarks";
import { useDrafts } from "@/lib/db/use-drafts";
import { SkillHubHero } from "@/components/hub/skill-hub-hero";
import { HubFilterBar, ResultCount } from "@/components/hub/hub-filter-bar";
import { LessonGrid } from "@/components/hub/lesson-grid";
import { LessonCard, type CardStatus } from "@/components/hub/lesson-card";
import { useHubFilters } from "@/components/hub/use-hub-filters";
import { countThisWeek } from "@/components/hub/week-count";
import { AccentFlag } from "@/components/ui/accent-flag";
import { formatDuration } from "@/lib/format";
import type { ListeningLessonMeta } from "@/lib/lessons/types";

const STATUS_OPTIONS = [
  { value: "learning" as const, label: "Learning" },
  { value: "learned" as const, label: "Learned" },
];

function ListeningMeta({ lesson }: { lesson: ListeningLessonMeta }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 truncate text-neutral-400">
      <AccentFlag accents={lesson.accents} />
      <Clock className="size-3 shrink-0" aria-hidden="true" />
      <span className="shrink-0">{lesson.totalDurationMs ? formatDuration(lesson.totalDurationMs) : "audio pending"}</span>
      <span aria-hidden="true">·</span>
      <span className="truncate">{lesson.sentenceCount} sentences</span>
    </div>
  );
}

function ListeningHubContent() {
  const { data: lessons, isLoading } = useListeningLessonsIndex();
  const bestByLesson = useDefaultBestAttempts();
  const bookmarks = useBookmarks();
  const drafts = useDrafts();

  const filters = useHubFilters({
    basePath: "/listening",
    lessons,
    sortStorageKey: "listening:sortBy",
    favoriteIds: bookmarks,
    learnedIds: bestByLesson,
    learningIds: drafts,
  });

  const completedCount = bestByLesson?.size ?? 0;
  const weekCount = useMemo(
    () => (bestByLesson ? countThisWeek([...bestByLesson.values()]) : 0),
    [bestByLesson],
  );

  function statusFor(id: string): CardStatus {
    const best = bestByLesson?.get(id);
    if (best) return { kind: "complete", label: `${best.score}/${best.total}` };
    if (drafts?.has(id)) return { kind: "in-progress", label: "In progress" };
    return { kind: "not-started" };
  }

  const lessonsAsMeta = (filters.display as unknown) as ListeningLessonMeta[];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <SkillHubHero
        title="Listening"
        subtitle="Audio stories & dialogues — listen, answer, and build your ear."
        done={completedCount}
        total={lessons?.length ?? 0}
        weekCount={weekCount}
      />
      <HubFilterBar filters={filters} statusOptions={STATUS_OPTIONS} />
      <ResultCount
        count={filters.display.length}
        hasActiveFilters={filters.hasActiveFilters}
        onClear={filters.clearAll}
      />
      <LessonGrid
        isLoading={isLoading}
        isEmpty={filters.display.length === 0}
        emptyMessage={
          filters.isSearching
            ? "No lessons match your search."
            : filters.hasActiveFilters
              ? "No lessons match these filters."
              : "No listening lessons yet."
        }
      >
        {lessonsAsMeta.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            href={`/listening/${lesson.id}`}
            status={statusFor(lesson.id)}
            highlight={filters.highlights.get(lesson.id)}
            metaLeft={<ListeningMeta lesson={lesson} />}
          />
        ))}
      </LessonGrid>
    </main>
  );
}

export default function ListeningHubPage() {
  return (
    <Suspense>
      <ListeningHubContent />
    </Suspense>
  );
}
