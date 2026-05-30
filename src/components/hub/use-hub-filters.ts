"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocalStorageString } from "@/lib/use-local-storage";
import {
  buildFuse,
  searchWithHighlights,
  sortLessons,
  SORT_OPTIONS,
  type SortBy,
  type LessonHighlight,
} from "@/lib/lessons/search-and-sort";
import type { CefrLevel, LessonMeta } from "@/lib/lessons/types";

export type HubStatus = "learning" | "learned";
const STATUS_VALUES: readonly HubStatus[] = ["learning", "learned"];

function parseList(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}
function parseStatus(value: string | null): HubStatus | null {
  return value && (STATUS_VALUES as readonly string[]).includes(value)
    ? (value as HubStatus)
    : null;
}

/** Minimal membership test — satisfied by both `Set<string>` and `Map<string, …>`. */
type Membership = { has(id: string): boolean };

export type HubFiltersConfig = {
  /** e.g. "/reading" — the hub route, used for URL writes. */
  basePath: string;
  lessons: LessonMeta[] | undefined;
  sortStorageKey: string;
  /** Membership tests for the favorites / status filters (undefined while loading). */
  favoriteIds?: Membership;
  learnedIds?: Membership;
  learningIds?: Membership;
};

export type HubFilters = ReturnType<typeof useHubFilters>;

/**
 * Shared hub filtering/search/sort state for every skill hub. URL is the source
 * of truth for level/tag/favorites/status; search is local; sort is persisted
 * to localStorage per hub. Mirrors the original reading-hub behavior exactly,
 * including the random-sort seed that re-rolls when filters change.
 */
export function useHubFilters({
  basePath,
  lessons,
  sortStorageKey,
  favoriteIds,
  learnedIds,
  learningIds,
}: HubFiltersConfig) {
  const router = useRouter();
  const params = useSearchParams();

  const selectedLevels = parseList(params.get("levels")) as CefrLevel[];
  const selectedTags = parseList(params.get("tags"));
  const favoritesOnly = params.get("favorites") === "1";
  const status = parseStatus(params.get("status"));

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useLocalStorageString<SortBy>(
    sortStorageKey,
    "name",
    SORT_OPTIONS,
  );
  const [randomSeed, setRandomSeed] = useState<number>(() =>
    Math.floor(Math.random() * 0xffffffff),
  );

  const levelsKey = selectedLevels.join(",");
  const tagsKey = selectedTags.join(",");

  // Re-roll the shuffle seed whenever filters change (best-effort useMemo cache
  // could otherwise silently reshuffle). Intentional setState-in-effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRandomSeed(Math.floor(Math.random() * 0xffffffff));
  }, [levelsKey, tagsKey, favoritesOnly, status]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    lessons?.forEach((l) => l.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return counts;
  }, [lessons]);

  const filtered = useMemo(() => {
    if (!lessons) return [];
    return lessons.filter((l) => {
      if (selectedLevels.length && !selectedLevels.includes(l.level)) return false;
      if (selectedTags.length && !selectedTags.some((t) => l.tags.includes(t))) return false;
      if (favoritesOnly && !favoriteIds?.has(l.id)) return false;
      if (status === "learned" && !learnedIds?.has(l.id)) return false;
      if (status === "learning" && !learningIds?.has(l.id)) return false;
      return true;
    });
  }, [lessons, levelsKey, tagsKey, favoritesOnly, status, favoriteIds, learnedIds, learningIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const fuse = useMemo(() => buildFuse(filtered), [filtered]);
  const { items: searched, highlights } = useMemo(
    () => searchWithHighlights(filtered, query, fuse),
    [filtered, query, fuse],
  );

  const isSearching = query.trim().length > 0;

  const display = useMemo(() => {
    if (isSearching && sortBy === "random") return searched;
    return sortLessons(searched, sortBy, randomSeed);
  }, [searched, sortBy, randomSeed, isSearching]);

  function writeParam(mutate: (sp: URLSearchParams) => void) {
    const sp = new URLSearchParams(params.toString());
    mutate(sp);
    const qs = sp.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath);
  }

  return {
    // state
    query,
    setQuery,
    sortBy,
    setSortBy,
    selectedLevels,
    selectedTags,
    favoritesOnly,
    status,
    isSearching,
    // derived
    tagCounts,
    display,
    highlights,
    hasActiveFilters:
      selectedLevels.length > 0 ||
      selectedTags.length > 0 ||
      favoritesOnly ||
      status !== null ||
      isSearching,
    // setters (URL-backed)
    setLevels: (next: string[]) =>
      writeParam((sp) => (next.length ? sp.set("levels", next.join(",")) : sp.delete("levels"))),
    setTags: (next: string[]) =>
      writeParam((sp) => (next.length ? sp.set("tags", next.join(",")) : sp.delete("tags"))),
    toggleFavorites: () =>
      writeParam((sp) => (favoritesOnly ? sp.delete("favorites") : sp.set("favorites", "1"))),
    setStatus: (next: HubStatus | null) =>
      writeParam((sp) => (next ? sp.set("status", next) : sp.delete("status"))),
    clearAll: () => {
      setQuery("");
      router.replace(basePath);
    },
  };
}

export type { LessonHighlight };
