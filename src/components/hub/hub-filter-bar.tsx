"use client";

import { SearchInput } from "./search-input";
import { SortButton } from "./sort-button";
import { LevelPills } from "./level-pills";
import { StatusPills, type StatusOption } from "./status-pills";
import { TagPills } from "./tag-pills";
import type { HubFilters } from "./use-hub-filters";

/** The sticky 3-row hub filter bar: search + sort, level + status pills, tags. */
export function HubFilterBar({
  filters,
  statusOptions,
  searchPlaceholder,
}: {
  filters: HubFilters;
  statusOptions: StatusOption[];
  searchPlaceholder?: string;
}) {
  return (
    <div className="sticky top-14 z-30 -mx-4 border-b border-neutral-200 bg-neutral-50/92 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/92 sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-2">
        <SearchInput value={filters.query} onChange={filters.setQuery} placeholder={searchPlaceholder} />
        <SortButton value={filters.sortBy} onChange={filters.setSortBy} />
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <LevelPills selected={filters.selectedLevels} onChange={filters.setLevels} />
        <span className="mx-1 h-4 w-px shrink-0 bg-neutral-200 dark:bg-white/10" aria-hidden="true" />
        <StatusPills
          favoritesActive={filters.favoritesOnly}
          onToggleFavorites={filters.toggleFavorites}
          options={statusOptions}
          activeStatus={filters.status}
          onStatus={filters.setStatus}
        />
      </div>
      <div className="mt-2">
        <TagPills tagCounts={filters.tagCounts} selected={filters.selectedTags} onChange={filters.setTags} />
      </div>
    </div>
  );
}

/** Result count + active-filter summary + "Clear filters" affordance. */
export function ResultCount({
  count,
  summary,
  hasActiveFilters,
  onClear,
}: {
  count: number;
  summary?: string;
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="mb-3 mt-4 flex items-center justify-between gap-2 text-sm text-neutral-500">
      <span>
        <span className="font-semibold text-neutral-700 dark:text-neutral-200">{count.toLocaleString()}</span> lessons
        {summary ? ` · ${summary}` : ""}
      </span>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-neutral-500 underline-offset-2 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
