"use client";

import { Suspense, useMemo } from "react";
import { useWritingLessonsIndex } from "@/lib/lessons/load";
import { useBestWritingAttempts } from "@/lib/db/use-best-writing-attempts";
import { useBookmarks } from "@/lib/db/use-bookmarks";
import { useWritingDrafts } from "@/lib/db/use-writing-drafts";
import { SkillHubHero } from "@/components/hub/skill-hub-hero";
import { HubFilterBar, ResultCount } from "@/components/hub/hub-filter-bar";
import { LessonGrid } from "@/components/hub/lesson-grid";
import { LessonCard, type CardStatus } from "@/components/hub/lesson-card";
import { useHubFilters } from "@/components/hub/use-hub-filters";
import { countThisWeek } from "@/components/hub/week-count";

const STATUS_OPTIONS = [
  { value: "learning" as const, label: "In draft" },
  { value: "learned" as const, label: "Graded" },
];

function WritingHubContent() {
  const { data: lessons, isLoading } = useWritingLessonsIndex();
  const bestByLesson = useBestWritingAttempts();
  const bookmarks = useBookmarks();
  const drafts = useWritingDrafts();

  const filters = useHubFilters({
    basePath: "/writing",
    lessons,
    sortStorageKey: "writing:sortBy",
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
    if (best) {
      const overall = best.llmResult?.scores.overall;
      return { kind: "complete", label: overall != null ? `${overall.toFixed(1)}/10` : "Attempted" };
    }
    if (drafts?.has(id)) return { kind: "in-progress", label: "Draft" };
    return { kind: "not-started" };
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <SkillHubHero
        title="Writing"
        subtitle="Writing prompts — draft your answer and get AI feedback."
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
            href={`/writing/${lesson.id}`}
            status={statusFor(lesson.id)}
            highlight={filters.highlights.get(lesson.id)}
          />
        ))}
      </LessonGrid>
    </main>
  );
}

export default function WritingHubPage() {
  return (
    <Suspense>
      <WritingHubContent />
    </Suspense>
  );
}
