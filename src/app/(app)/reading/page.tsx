"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAllReadingLessons } from "@/lib/lessons/load";
import { useDefaultBestAttempts } from "@/lib/db/use-best-attempts";
import { FilterChipRow, type ChipOption } from "@/components/reading/filter-chip-row";
import { LessonCard } from "@/components/reading/lesson-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CefrLevel } from "@/lib/lessons/types";

const LEVEL_OPTIONS: ChipOption[] = [
  { value: "A1", label: "A1", className: "bg-level-a1 text-level-a1-foreground" },
  { value: "A2", label: "A2", className: "bg-level-a2 text-level-a2-foreground" },
  { value: "B1", label: "B1", className: "bg-level-b1 text-level-b1-foreground" },
  { value: "B2", label: "B2", className: "bg-level-b2 text-level-b2-foreground" },
  { value: "C1", label: "C1", className: "bg-level-c1 text-level-c1-foreground" },
];

function parseList(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function ReadingHubContent() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedLevels = parseList(params.get("levels"));
  const selectedTags = parseList(params.get("tags"));

  const { data: lessons, isLoading } = useAllReadingLessons();
  const bestByLesson = useDefaultBestAttempts();

  const allTags = useMemo(() => {
    const set = new Set<string>();
    lessons?.forEach((l) => l.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [lessons]);

  const filtered = useMemo(() => {
    if (!lessons) return [];
    return lessons.filter((l) => {
      if (selectedLevels.length && !selectedLevels.includes(l.level)) return false;
      if (selectedTags.length && !selectedTags.some((t) => l.tags.includes(t))) return false;
      return true;
    });
  }, [lessons, selectedLevels, selectedTags]);

  const completedCount = useMemo(
    () => (bestByLesson ? bestByLesson.size : 0),
    [bestByLesson],
  );

  function setParam(key: "levels" | "tags", next: string[]) {
    const sp = new URLSearchParams(params.toString());
    if (next.length === 0) sp.delete(key);
    else sp.set(key, next.join(","));
    router.replace(`/reading?${sp.toString()}`);
  }

  const tagOptions: ChipOption[] = allTags.map((t) => ({ value: t, label: t }));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Reading lessons</h1>
        <p className="text-xs text-muted-foreground">
          {completedCount} / {lessons?.length ?? 0} completed
        </p>
      </header>

      <div className="mb-3">
        <FilterChipRow
          label="Level"
          options={LEVEL_OPTIONS}
          selected={selectedLevels}
          onChange={(next) => setParam("levels", next as CefrLevel[])}
        />
      </div>
      <div className="mb-4 flex items-center gap-3">
        <FilterChipRow
          label="Tags"
          options={tagOptions}
          selected={selectedTags}
          onChange={(next) => setParam("tags", next)}
        />
        {(selectedLevels.length > 0 || selectedTags.length > 0) && (
          <button
            type="button"
            onClick={() => router.replace("/reading")}
            className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No lessons match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              bestAttempt={bestByLesson?.get(lesson.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReadingHubPage() {
  return (
    <Suspense>
      <ReadingHubContent />
    </Suspense>
  );
}
