"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useReadingLessonsIndex } from "@/lib/lessons/load";
import { useDefaultBestAttempts } from "@/lib/db/use-best-attempts";
import { useBookmarks } from "@/lib/db/use-bookmarks";
import { FilterChipRow, type ChipOption } from "@/components/reading/filter-chip-row";
import { TagFilterRow } from "@/components/reading/tag-filter-row";
import { LessonCard } from "@/components/reading/lesson-card";
import { LessonSearch } from "@/components/reading/lesson-search";
import { SortSelect } from "@/components/reading/sort-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalStorageString } from "@/lib/use-local-storage";
import {
  buildFuse,
  searchLessons,
  sortLessons,
  SORT_OPTIONS,
  type SortBy,
} from "@/lib/lessons/search-and-sort";
import { cn } from "@/lib/utils";
import type { CefrLevel } from "@/lib/lessons/types";

const LEVEL_OPTIONS: ChipOption[] = [
  { value: "A1", label: "A1", className: "bg-level-a1 text-level-a1-foreground" },
  { value: "A2", label: "A2", className: "bg-level-a2 text-level-a2-foreground" },
  { value: "B1", label: "B1", className: "bg-level-b1 text-level-b1-foreground" },
  { value: "B2", label: "B2", className: "bg-level-b2 text-level-b2-foreground" },
  { value: "C1", label: "C1", className: "bg-level-c1 text-level-c1-foreground" },
];

const SORT_STORAGE_KEY = "reading:sortBy";

function parseList(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function ReadingHubContent() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedLevels = parseList(params.get("levels"));
  const selectedTags = parseList(params.get("tags"));
  const favoritesOnly = params.get("favorites") === "1";

  const { data: lessons, isLoading } = useReadingLessonsIndex();
  const bestByLesson = useDefaultBestAttempts();
  const bookmarks = useBookmarks();

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useLocalStorageString<SortBy>(
    SORT_STORAGE_KEY,
    "name",
    SORT_OPTIONS,
  );
  const [randomSeed, setRandomSeed] = useState<number>(() =>
    Math.floor(Math.random() * 0xffffffff),
  );

  const levelsKey = selectedLevels.join(",");
  const tagsKey = selectedTags.join(",");

  useEffect(() => {
    setRandomSeed(Math.floor(Math.random() * 0xffffffff));
  }, [levelsKey, tagsKey, favoritesOnly]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    lessons?.forEach((l) =>
      l.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)),
    );
    return counts;
  }, [lessons]);

  const filtered = useMemo(() => {
    if (!lessons) return [];
    return lessons.filter((l) => {
      if (selectedLevels.length && !selectedLevels.includes(l.level)) return false;
      if (selectedTags.length && !selectedTags.some((t) => l.tags.includes(t))) return false;
      if (favoritesOnly && !bookmarks?.has(l.id)) return false;
      return true;
    });
  }, [lessons, selectedLevels, selectedTags, favoritesOnly, bookmarks]);

  const fuse = useMemo(() => buildFuse(filtered), [filtered]);

  const searched = useMemo(
    () => searchLessons(filtered, query, fuse),
    [filtered, query, fuse],
  );

  const isSearching = query.trim().length > 0;

  const display = useMemo(() => {
    if (isSearching && sortBy === "random") return searched;
    return sortLessons(searched, sortBy, randomSeed);
  }, [searched, sortBy, randomSeed, isSearching]);

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

  function toggleFavorites() {
    const sp = new URLSearchParams(params.toString());
    if (favoritesOnly) sp.delete("favorites");
    else sp.set("favorites", "1");
    router.replace(`/reading?${sp.toString()}`);
  }

  function clearAllFilters() {
    setQuery("");
    router.replace("/reading");
  }

  const hasActiveFilters =
    selectedLevels.length > 0 || selectedTags.length > 0 || favoritesOnly || isSearching;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pl-12 md:pl-0">
        <h1 className="text-lg font-semibold sm:text-xl">Reading lessons</h1>
        <p className="text-xs text-muted-foreground">
          {completedCount} / {lessons?.length ?? 0} completed
        </p>
      </header>

      <div className="mb-3">
        <LessonSearch value={query} onChange={setQuery} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FilterChipRow
          label="Level"
          options={LEVEL_OPTIONS}
          selected={selectedLevels}
          onChange={(next) => setParam("levels", next as CefrLevel[])}
        />
        <button
          type="button"
          onClick={toggleFavorites}
          aria-pressed={favoritesOnly}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            favoritesOnly
              ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : "border-border text-muted-foreground hover:bg-accent",
          )}
        >
          <Star
            className={cn("size-3", favoritesOnly && "fill-amber-400 stroke-amber-500")}
            aria-hidden="true"
          />
          Favorites
        </button>
        <div className="ml-auto">
          <SortSelect value={sortBy} onChange={setSortBy} />
        </div>
      </div>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex-1">
          <TagFilterRow
            tagCounts={tagCounts}
            selected={selectedTags}
            onChange={(next) => setParam("tags", next)}
          />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline"
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
      ) : display.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {isSearching
            ? "No lessons match your search."
            : "No lessons match these filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {display.map((lesson) => (
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
