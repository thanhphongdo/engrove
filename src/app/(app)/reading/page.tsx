"use client";

import { Suspense, useMemo } from "react";
import { useReadingLessonsIndex } from "@/lib/lessons/load";
import { useDefaultBestAttempts } from "@/lib/db/use-best-attempts";
import { useBookmarks } from "@/lib/db/use-bookmarks";
import { useDrafts } from "@/lib/db/use-drafts";
import { SkillHubHero } from "@/components/hub/skill-hub-hero";
import { HubFilterBar, ResultCount } from "@/components/hub/hub-filter-bar";
import { LessonGrid } from "@/components/hub/lesson-grid";
import { LessonCard, type CardStatus } from "@/components/hub/lesson-card";
import { useHubFilters } from "@/components/hub/use-hub-filters";
import { countThisWeek } from "@/components/hub/week-count";

const STATUS_OPTIONS = [
  { value: "learning" as const, label: "Learning" },
  { value: "learned" as const, label: "Learned" },
];

function ReadingHubContent() {
  const { data: lessons, isLoading } = useReadingLessonsIndex();
  const bestByLesson = useDefaultBestAttempts();
  const bookmarks = useBookmarks();
  const drafts = useDrafts();

  const filters = useHubFilters({
    basePath: "/reading",
    lessons,
    sortStorageKey: "reading:sortBy",
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

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <SkillHubHero
        title="Reading"
        subtitle="Short stories & letters — read, answer, and learn new words."
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
        emptyMessage={filters.isSearching ? "No lessons match your search." : "No lessons match these filters."}
      >
        {filters.display.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            href={`/reading/${lesson.id}`}
            status={statusFor(lesson.id)}
            highlight={filters.highlights.get(lesson.id)}
          />
        ))}
      </LessonGrid>
    </main>
  );
}

export default function ReadingHubPage() {
  return (
    <Suspense>
      <ReadingHubContent />
    </Suspense>
  );
}
