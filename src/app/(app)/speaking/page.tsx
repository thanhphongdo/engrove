"use client";

import { Suspense, useMemo } from "react";
import { useSpeakingLessonsIndex } from "@/lib/lessons/load";
import { useSpeakingRecordingsByLesson } from "@/lib/db/use-speaking-recordings";
import { useSpeakingSessionDrafts } from "@/lib/db/use-speaking-session-draft";
import { useBookmarks } from "@/lib/db/use-bookmarks";
import { SkillHubHero } from "@/components/hub/skill-hub-hero";
import { HubFilterBar, ResultCount } from "@/components/hub/hub-filter-bar";
import { LessonGrid } from "@/components/hub/lesson-grid";
import { LessonCard, type CardStatus } from "@/components/hub/lesson-card";
import { useHubFilters } from "@/components/hub/use-hub-filters";
import { countThisWeek } from "@/components/hub/week-count";
import type { LessonMeta } from "@/lib/lessons/types";

const STATUS_OPTIONS = [
  { value: "learning" as const, label: "In progress" },
  { value: "learned" as const, label: "Practiced" },
];

function SpeakingHubContent() {
  const { data: lessons, isLoading } = useSpeakingLessonsIndex();
  const recordingsByLesson = useSpeakingRecordingsByLesson();
  const sessionDrafts = useSpeakingSessionDrafts();
  const bookmarks = useBookmarks();

  const filters = useHubFilters({
    basePath: "/speaking",
    lessons: lessons as unknown as LessonMeta[] | undefined,
    sortStorageKey: "speaking:sortBy",
    favoriteIds: bookmarks,
    learnedIds: recordingsByLesson,
    learningIds: sessionDrafts,
  });

  const completedCount = recordingsByLesson?.size ?? 0;
  const weekCount = useMemo(
    () => (recordingsByLesson ? countThisWeek([...recordingsByLesson.values()]) : 0),
    [recordingsByLesson],
  );

  function statusFor(id: string): CardStatus {
    if (recordingsByLesson?.has(id)) return { kind: "complete", label: "Practiced" };
    if (sessionDrafts?.has(id)) return { kind: "in-progress", label: "In progress" };
    return { kind: "not-started" };
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <SkillHubHero
        title="Speaking"
        subtitle="Real conversations — listen, then practice speaking aloud."
        done={completedCount}
        total={lessons?.length ?? 0}
        verb="practiced"
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
              : "No speaking lessons yet."
        }
      >
        {filters.display.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            href={`/speaking/${lesson.id}`}
            status={statusFor(lesson.id)}
            highlight={filters.highlights.get(lesson.id)}
          />
        ))}
      </LessonGrid>
    </main>
  );
}

export default function SpeakingHubPage() {
  return (
    <Suspense>
      <SpeakingHubContent />
    </Suspense>
  );
}
