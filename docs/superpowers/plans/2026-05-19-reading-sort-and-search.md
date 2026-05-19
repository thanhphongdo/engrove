# Reading Hub — Sort & Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Order-By control (Name / Level / Random, persisted in `localStorage`) and a Fuse.js-powered fuzzy search over `title` + `summary` to the `/reading` hub page.

**Architecture:** Pure helpers in `src/lib/lessons/search-and-sort.ts` (Fuse builder, seeded shuffle, sorters). A `useLocalStorageString` hook adds typed string persistence next to the existing boolean variant. Two thin presentational components (`LessonSearch`, `SortSelect`) wrap the shadcn primitives. `src/app/(app)/reading/page.tsx` composes `filter → search → sort` and owns the `randomSeed` regeneration effect.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, shadcn/Radix primitives, Vitest, Fuse.js.

**Spec:** [docs/superpowers/specs/2026-05-19-reading-sort-and-search-design.md](../specs/2026-05-19-reading-sort-and-search-design.md)

---

## Files

### New

- `src/lib/lessons/search-and-sort.ts` — `SortBy` type, `mulberry32`, `shuffle`, `sortLessons`, `buildFuse`, `searchLessons`.
- `src/lib/lessons/search-and-sort.test.ts` — Vitest unit tests for all helpers.
- `src/components/reading/lesson-search.tsx` — controlled search `Input` with `Search` icon + clear button.
- `src/components/reading/sort-select.tsx` — shadcn `Select` styled as a chip-height sort trigger.

### Modified

- `src/lib/use-local-storage.ts` — add `useLocalStorageString<T>` hook alongside existing `useLocalStorageBoolean`.
- `src/app/(app)/reading/page.tsx` — wire search query state, sort hook, random-seed effect, render the new controls, extend Clear-filters.
- `package.json` / `package-lock.json` — add `fuse.js`.

---

## Task 1: Add `fuse.js` dependency

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install Fuse.js**

Run from repo root:

```bash
npm install fuse.js
```

Expected: `package.json` and `package-lock.json` updated; new entry under `dependencies` for `fuse.js` (version `^7.x`).

- [ ] **Step 2: Verify install**

Run:

```bash
node -e "console.log(require('fuse.js').default ? 'ok' : 'missing')"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add fuse.js for client-side fuzzy search on reading hub"
```

---

## Task 2: Add `useLocalStorageString` hook

**Files:**
- Modify: `src/lib/use-local-storage.ts`

The existing `useLocalStorageBoolean` hook has no unit tests (it's a thin browser-only wrapper). Mirror the same pattern — no tests for `useLocalStorageString` either; correctness is exercised by the page using it.

- [ ] **Step 1: Add the hook**

Replace the contents of `src/lib/use-local-storage.ts` with:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";

export function useLocalStorageBoolean(
  key: string,
  defaultValue = false,
): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState<boolean>(defaultValue);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === "1" || raw === "true") setValue(true);
      else if (raw === "0" || raw === "false") setValue(false);
    } catch {
      // ignore — private mode etc.
    }
  }, [key]);

  const set = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // ignore
      }
    },
    [key],
  );

  return [value, set];
}

export function useLocalStorageString<T extends string>(
  key: string,
  defaultValue: T,
  allowed?: readonly T[],
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return;
      if (allowed && !allowed.includes(raw as T)) return;
      setValue(raw as T);
    } catch {
      // ignore — private mode etc.
    }
  }, [key, allowed]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // ignore
      }
    },
    [key],
  );

  return [value, set];
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/use-local-storage.ts
git commit -m "feat(lib): add useLocalStorageString hook for typed string persistence"
```

---

## Task 3: Write failing tests for `search-and-sort` helpers

**Files:**
- Create: `src/lib/lessons/search-and-sort.test.ts`

- [ ] **Step 1: Write the test file**

Create `src/lib/lessons/search-and-sort.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  mulberry32,
  shuffle,
  sortLessons,
  buildFuse,
  searchLessons,
} from "./search-and-sort";
import type { LessonMeta, CefrLevel } from "./types";

const lesson = (
  id: string,
  level: CefrLevel,
  title: string,
  summary = "",
  tags: string[] = [],
): LessonMeta => ({ id, level, title, summary, tags });

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });
});

describe("shuffle", () => {
  const input = [1, 2, 3, 4, 5];

  it("does not mutate the input array", () => {
    const copy = [...input];
    shuffle(input, mulberry32(7));
    expect(input).toEqual(copy);
  });

  it("returns a permutation of the input", () => {
    const out = shuffle(input, mulberry32(7));
    expect(out.slice().sort()).toEqual(input.slice().sort());
  });

  it("is deterministic for a given seed", () => {
    expect(shuffle(input, mulberry32(7))).toEqual(shuffle(input, mulberry32(7)));
  });
});

describe("sortLessons", () => {
  const lessons: LessonMeta[] = [
    lesson("c", "B1", "Chess club"),
    lesson("a", "A1", "Asking directions"),
    lesson("b", "A2", "Beach day"),
    lesson("d", "A1", "Afternoon tea"),
  ];

  it("sorts by name (locale-aware ascending)", () => {
    const out = sortLessons(lessons, "name", 0);
    expect(out.map((l) => l.title)).toEqual([
      "Afternoon tea",
      "Asking directions",
      "Beach day",
      "Chess club",
    ]);
  });

  it("sorts by level A1 -> C1 with title as tiebreaker", () => {
    const out = sortLessons(lessons, "level", 0);
    expect(out.map((l) => l.id)).toEqual(["d", "a", "b", "c"]);
  });

  it("sorts randomly and is deterministic given a seed", () => {
    const a = sortLessons(lessons, "random", 12345);
    const b = sortLessons(lessons, "random", 12345);
    expect(a).toEqual(b);
  });

  it("produces different orders for different seeds", () => {
    const a = sortLessons(lessons, "random", 1);
    const b = sortLessons(lessons, "random", 99999);
    expect(a).not.toEqual(b);
  });

  it("does not mutate the input list", () => {
    const copy = [...lessons];
    sortLessons(lessons, "name", 0);
    sortLessons(lessons, "level", 0);
    sortLessons(lessons, "random", 0);
    expect(lessons).toEqual(copy);
  });
});

describe("searchLessons", () => {
  const lessons: LessonMeta[] = [
    lesson("1", "A1", "Ordering coffee", "A short dialogue at a busy café."),
    lesson("2", "A1", "At the library", "Borrowing books and asking for help."),
    lesson("3", "A2", "Morning routine", "Daily habits and time expressions."),
    lesson("4", "B1", "Job interview", "Talking about strengths at work."),
  ];

  it("returns the input list unchanged for an empty query", () => {
    const fuse = buildFuse(lessons);
    expect(searchLessons(lessons, "", fuse)).toBe(lessons);
  });

  it("returns the input list unchanged for a whitespace-only query", () => {
    const fuse = buildFuse(lessons);
    expect(searchLessons(lessons, "   ", fuse)).toBe(lessons);
  });

  it("matches titles", () => {
    const fuse = buildFuse(lessons);
    const out = searchLessons(lessons, "coffee", fuse);
    expect(out.map((l) => l.id)).toContain("1");
  });

  it("matches summaries", () => {
    const fuse = buildFuse(lessons);
    const out = searchLessons(lessons, "borrowing", fuse);
    expect(out.map((l) => l.id)).toContain("2");
  });

  it("returns [] when nothing matches", () => {
    const fuse = buildFuse(lessons);
    expect(searchLessons(lessons, "zzznotapresentword", fuse)).toEqual([]);
  });

  it("ranks title hits above summary hits for the same term", () => {
    const seeded: LessonMeta[] = [
      lesson("s", "A1", "Cooking class", "A friendly intro to weekend coffee meetups."),
      lesson("t", "A1", "Coffee shop chat", "A short conversation at a bakery."),
    ];
    const fuse = buildFuse(seeded);
    const out = searchLessons(seeded, "coffee", fuse);
    expect(out[0].id).toBe("t");
  });

  it("tolerates a small typo", () => {
    const fuse = buildFuse(lessons);
    const out = searchLessons(lessons, "intervew", fuse); // missing 'i'
    expect(out.map((l) => l.id)).toContain("4");
  });
});
```

- [ ] **Step 2: Run the tests — expect ALL to fail (module not found)**

Run:

```bash
npm test -- src/lib/lessons/search-and-sort.test.ts
```

Expected: failure with `Cannot find module './search-and-sort'` or equivalent resolution error from Vitest.

- [ ] **Step 3: Commit (tests-only, expected red)**

```bash
git add src/lib/lessons/search-and-sort.test.ts
git commit -m "test(lessons): add failing tests for search-and-sort helpers"
```

---

## Task 4: Implement `search-and-sort` helpers

**Files:**
- Create: `src/lib/lessons/search-and-sort.ts`

- [ ] **Step 1: Implement the module**

Create `src/lib/lessons/search-and-sort.ts`:

```typescript
import Fuse from "fuse.js";
import type { CefrLevel, LessonMeta } from "./types";

export type SortBy = "name" | "level" | "random";

export const SORT_OPTIONS: readonly SortBy[] = ["name", "level", "random"] as const;

const LEVEL_RANK: Record<CefrLevel, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
};

const collator = new Intl.Collator(undefined, { sensitivity: "base" });

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sortLessons(
  lessons: readonly LessonMeta[],
  sortBy: SortBy,
  seed: number,
): LessonMeta[] {
  if (sortBy === "name") {
    return lessons.slice().sort((a, b) => collator.compare(a.title, b.title));
  }
  if (sortBy === "level") {
    return lessons.slice().sort((a, b) => {
      const d = LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
      return d !== 0 ? d : collator.compare(a.title, b.title);
    });
  }
  return shuffle(lessons, mulberry32(seed));
}

export function buildFuse(lessons: readonly LessonMeta[]): Fuse<LessonMeta> {
  return new Fuse(lessons.slice(), {
    keys: [
      { name: "title", weight: 0.7 },
      { name: "summary", weight: 0.3 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    includeScore: false,
    minMatchCharLength: 2,
  });
}

export function searchLessons(
  lessons: readonly LessonMeta[],
  query: string,
  fuse: Fuse<LessonMeta>,
): LessonMeta[] {
  const q = query.trim();
  if (q === "") return lessons as LessonMeta[];
  return fuse.search(q).map((r) => r.item);
}
```

- [ ] **Step 2: Run the tests — expect ALL to pass**

Run:

```bash
npm test -- src/lib/lessons/search-and-sort.test.ts
```

Expected: all tests pass (mulberry32 ×2, shuffle ×3, sortLessons ×5, searchLessons ×7).

- [ ] **Step 3: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/lessons/search-and-sort.ts
git commit -m "feat(lessons): add search-and-sort helpers (mulberry32, shuffle, sortLessons, Fuse search)"
```

---

## Task 5: Build the `LessonSearch` component

**Files:**
- Create: `src/components/reading/lesson-search.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/reading/lesson-search.tsx`:

```typescript
"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function LessonSearch({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:max-w-sm", className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search lessons by name or summary…"
        aria-label="Search lessons"
        className="pl-8 pr-8"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Lint**

Run:

```bash
npm run lint
```

Expected: clean (or warnings only in unrelated files — no new errors).

- [ ] **Step 4: Commit**

```bash
git add src/components/reading/lesson-search.tsx
git commit -m "feat(reading): add LessonSearch input component with clear button"
```

---

## Task 6: Build the `SortSelect` component

**Files:**
- Create: `src/components/reading/sort-select.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/reading/sort-select.tsx`:

```typescript
"use client";

import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortBy } from "@/lib/lessons/search-and-sort";

const LABELS: Record<SortBy, string> = {
  name: "Name",
  level: "Level",
  random: "Random",
};

export function SortSelect({
  value,
  onChange,
}: {
  value: SortBy;
  onChange: (next: SortBy) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortBy)}>
      <SelectTrigger
        size="sm"
        aria-label="Sort lessons"
        className="rounded-full px-2.5 text-xs"
      >
        <ArrowUpDown className="size-3 text-muted-foreground" aria-hidden="true" />
        <SelectValue>Sort: {LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="name">Name</SelectItem>
        <SelectItem value="level">Level</SelectItem>
        <SelectItem value="random">Random</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/reading/sort-select.tsx
git commit -m "feat(reading): add SortSelect chip-styled dropdown for sort modes"
```

---

## Task 7: Wire search + sort into the reading hub page

**Files:**
- Modify: `src/app/(app)/reading/page.tsx`

- [ ] **Step 1: Replace the page contents**

Replace the entire contents of `src/app/(app)/reading/page.tsx` with:

```typescript
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
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 4: Run all unit tests**

Run:

```bash
npm test
```

Expected: all tests pass, including the new `search-and-sort.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/reading/page.tsx
git commit -m "feat(reading): add sort (name/level/random) + Fuse search to hub page"
```

---

## Task 8: Manual verification in the browser

**Files:**
- None (browser-only).

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Next.js dev server listening on `http://localhost:4600`.

- [ ] **Step 2: Open the reading hub**

Visit `http://localhost:4600/reading` in a browser.

Check the page renders:
- Search input above the filter rows.
- Level chips + Favorites toggle on row 1.
- `Sort: Name ▾` dropdown right-aligned on row 1.
- Tag chips on row 2.

- [ ] **Step 3: Verify sort persistence**

1. Open the Sort dropdown → choose `Level`. Grid re-orders A1 → C1.
2. Reload the page. Sort dropdown still shows `Sort: Level` and grid is still level-ordered.
3. In DevTools → Application → Local Storage, confirm `reading:sortBy` is `level`.
4. Change to `Name`, reload, confirm persistence.
5. Change to `Random`.

- [ ] **Step 4: Verify random re-shuffle on filter change**

With `Sort: Random` selected:
1. Note the order of the first 3 cards.
2. Click `A1` in the Level chips. Order should be different (new seed).
3. Click `A1` again to clear. Order should change again.
4. Toggle Favorites. Order changes.

- [ ] **Step 5: Verify random does NOT reshuffle while typing**

With `Sort: Random` selected and no filters:
1. Note the order of the first 3 visible cards.
2. Type a letter in search, then delete it. The set of cards may differ during the search, but after clearing the query the original mount-seeded order should still be in effect (not a fresh shuffle).

- [ ] **Step 6: Verify search**

1. Type a word that appears in a lesson title (e.g., a noun from a card you can see). Cards filter down to relevance-ranked matches.
2. Type a word that appears only in summaries. Confirm matches surface.
3. Type a deliberate typo (drop one letter). Confirm the intended lesson still shows up.
4. Type gibberish (`zzznotapresentword`). Confirm "No lessons match your search." copy.
5. Click the `X` clear button. Search clears and the full list returns.

- [ ] **Step 7: Verify search + sort interaction**

With a non-empty search query:
1. Switch sort to `Name` → results re-order by name.
2. Switch sort to `Level` → results re-order by level.
3. Switch sort to `Random` → results stay in Fuse relevance order (Random ignored while searching).

- [ ] **Step 8: Verify Clear filters**

1. Select a Level, type in search, toggle Favorites.
2. Click `Clear filters`. Level chips, favorites, and search query all clear. Sort mode is preserved.

- [ ] **Step 9: Dark mode smoke**

Toggle dark mode (existing app shell control). Confirm the search input border, clear-button hover, and sort dropdown all look right.

- [ ] **Step 10: Stop the dev server**

Press `Ctrl-C` in the terminal running `npm run dev`.

No commit for this task — verification only.

---

## Self-Review Notes

Cross-checked against the spec's Verification Checklist:

- ✅ Sort persistence via `useLocalStorageString` (Task 2 + Task 7) — verified in Task 8 Step 3.
- ✅ Random re-shuffle on mount + filter change, not on search — `useEffect` deps in Task 7 + Task 8 Steps 4–5.
- ✅ Search by title & summary — `buildFuse` weights in Task 4 + Task 8 Step 6.
- ✅ Random + search → Fuse relevance order — `display` memo branch in Task 7 + Task 8 Step 7.
- ✅ Name / Level + search → re-sort Fuse results — `sortLessons(searched, …)` in Task 7.
- ✅ Clear filters clears query but keeps sort — `clearAllFilters` in Task 7 + Task 8 Step 8.
- ✅ Empty-state copy distinguishes filter vs. search — Task 7 render branch.
- ✅ Unit tests for `mulberry32`, `shuffle`, `sortLessons`, `searchLessons` — Task 3 + Task 4.
- ✅ Type names consistent: `SortBy`, `SORT_OPTIONS`, `mulberry32`, `shuffle`, `sortLessons`, `buildFuse`, `searchLessons`, `useLocalStorageString` — same across Tasks 2, 3, 4, 5, 6, 7.
