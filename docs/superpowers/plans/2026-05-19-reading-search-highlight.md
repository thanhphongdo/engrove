# Reading Hub — Tag Search + Match Highlighting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `tags` as a Fuse search key and highlight matched character ranges (in title, summary, and tags) on each lesson card.

**Architecture:** Fuse config gains a `tags` key + `includeMatches: true`. A private `runSearch` helper centralizes the single Fuse invocation per render. A new `buildHighlightMap` pure helper projects raw Fuse results into a `Map<lessonId, LessonHighlight>` consumed by `LessonCard`. A pure `normalizeRanges` helper (clamp/merge/sort) backs a thin `<HighlightedText>` component that renders alternating plain `<span>` and `<mark>` segments. Tags are reordered so matched tags surface first in the visible 3.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Fuse.js 7, Vitest.

**Spec:** [docs/superpowers/specs/2026-05-19-reading-search-highlight-design.md](../specs/2026-05-19-reading-search-highlight-design.md)

---

## Files

### New

- `src/components/reading/highlighted-text.tsx` — thin component over `normalizeRanges`; renders alternating plain `<span>` + `<mark>` segments.

### Modified

- `src/lib/lessons/search-and-sort.ts` — new Fuse config (3 keys, `includeMatches: true`); private `runSearch`; export `normalizeRanges`, `LessonHighlight`, `buildHighlightMap`; refactor `searchLessons` to share `runSearch`.
- `src/lib/lessons/search-and-sort.test.ts` — add a tag-match test plus full coverage for `normalizeRanges` and `buildHighlightMap`.
- `src/components/reading/lesson-card.tsx` — accept `highlight?: LessonHighlight`; render title/summary via `HighlightedText`; reorder + highlight tags.
- `src/app/(app)/reading/page.tsx` — compute `highlights` memo from `fuse` + `query`; pass `highlight` to each `LessonCard`.

---

## Task 1: Add failing tests (TDD red)

**Files:**
- Modify: `src/lib/lessons/search-and-sort.test.ts`

- [ ] **Step 1: Append the new test blocks**

Open `src/lib/lessons/search-and-sort.test.ts`. Update the import line at the top to add `normalizeRanges`, `buildHighlightMap`, and `LessonHighlight`:

Replace the existing top import block:

```typescript
import {
  mulberry32,
  shuffle,
  sortLessons,
  buildFuse,
  searchLessons,
} from "./search-and-sort";
import type { LessonMeta, CefrLevel } from "./types";
```

with:

```typescript
import {
  mulberry32,
  shuffle,
  sortLessons,
  buildFuse,
  searchLessons,
  normalizeRanges,
  buildHighlightMap,
} from "./search-and-sort";
import type { LessonMeta, CefrLevel } from "./types";
```

Then append the following test blocks to the END of the file (after the existing `describe("searchLessons", …)` block):

```typescript
describe("searchLessons (tags)", () => {
  it("matches when the query appears only in a lesson's tags", () => {
    const lessons: LessonMeta[] = [
      lesson(
        "1",
        "A1",
        "Quiet evening",
        "A short text about staying in.",
        ["coffee", "relaxation"],
      ),
      lesson("2", "A1", "Daily walk", "A walk through the park.", ["exercise"]),
    ];
    const fuse = buildFuse(lessons);
    const out = searchLessons(lessons, "coffee", fuse);
    expect(out.map((l) => l.id)).toContain("1");
    expect(out.map((l) => l.id)).not.toContain("2");
  });
});

describe("normalizeRanges", () => {
  it("returns [] for an empty input", () => {
    expect(normalizeRanges([], 10)).toEqual([]);
  });

  it("passes a single in-bounds range through unchanged", () => {
    expect(normalizeRanges([[2, 5]], 10)).toEqual([[2, 5]]);
  });

  it("clamps end past textLength", () => {
    expect(normalizeRanges([[2, 20]], 10)).toEqual([[2, 10]]);
  });

  it("drops a range with start < 0", () => {
    expect(normalizeRanges([[-1, 4]], 10)).toEqual([]);
  });

  it("drops a range where start >= end after clamping", () => {
    expect(normalizeRanges([[5, 5]], 10)).toEqual([]);
    expect(normalizeRanges([[12, 15]], 10)).toEqual([]);
  });

  it("merges overlapping ranges", () => {
    expect(normalizeRanges([[2, 6], [4, 8]], 10)).toEqual([[2, 8]]);
  });

  it("merges adjacent ranges", () => {
    expect(normalizeRanges([[0, 3], [3, 5]], 10)).toEqual([[0, 5]]);
  });

  it("sorts unsorted input by start", () => {
    expect(normalizeRanges([[5, 7], [0, 2]], 10)).toEqual([[0, 2], [5, 7]]);
  });
});

describe("buildHighlightMap", () => {
  const lessons: LessonMeta[] = [
    lesson(
      "1",
      "A1",
      "Ordering coffee",
      "A short dialogue at a busy café.",
      ["coffee", "morning"],
    ),
    lesson(
      "2",
      "A1",
      "At the library",
      "Borrowing books and asking for help.",
      ["books", "help"],
    ),
    lesson(
      "3",
      "B1",
      "Job interview",
      "Talking about strengths at work.",
      ["careers"],
    ),
  ];

  it("returns an empty map for an empty query", () => {
    const fuse = buildFuse(lessons);
    expect(buildHighlightMap(fuse, "").size).toBe(0);
  });

  it("returns an empty map for a whitespace-only query", () => {
    const fuse = buildFuse(lessons);
    expect(buildHighlightMap(fuse, "   ").size).toBe(0);
  });

  it("omits lessons that did not match", () => {
    const fuse = buildFuse(lessons);
    const map = buildHighlightMap(fuse, "library");
    expect(map.has("2")).toBe(true);
    expect(map.has("1")).toBe(false);
    expect(map.has("3")).toBe(false);
  });

  it("partitions matches into title / summary / tag ranges", () => {
    const fuse = buildFuse(lessons);
    const map = buildHighlightMap(fuse, "coffee");
    const h = map.get("1");
    expect(h).toBeDefined();
    expect(h!.titleRanges.length).toBeGreaterThan(0);
    expect(h!.summaryRanges.length).toBe(0);
    expect(h!.tagRanges.get("coffee")).toBeDefined();
    expect(h!.tagRanges.get("coffee")!.length).toBeGreaterThan(0);
  });

  it("keys tagRanges by the exact tag string and stores ranges within that tag", () => {
    const fuse = buildFuse(lessons);
    const map = buildHighlightMap(fuse, "books");
    const h = map.get("2");
    expect(h).toBeDefined();
    expect(h!.tagRanges.has("books")).toBe(true);
    const ranges = h!.tagRanges.get("books")!;
    // "books" matched at start of the tag string "books"
    expect(ranges[0][0]).toBe(0);
    expect(ranges[0][1]).toBe(5);
  });
});
```

- [ ] **Step 2: Run the tests — confirm the new ones fail**

Run:

```bash
npm test -- src/lib/lessons/search-and-sort.test.ts
```

Expected: the 17 existing tests still pass; the 14 newly-added tests fail with import errors for `normalizeRanges` / `buildHighlightMap` and a missing `tags` index (for the tag-search test).

- [ ] **Step 3: Commit**

```bash
git add src/lib/lessons/search-and-sort.test.ts
git commit -m "test(lessons): add failing tests for tag search and highlight helpers"
```

Only the test file should be staged. Unrelated working-tree files stay untouched.

---

## Task 2: Implement Fuse changes + highlight helpers (TDD green)

**Files:**
- Modify: `src/lib/lessons/search-and-sort.ts`

- [ ] **Step 1: Replace the file contents**

Replace `src/lib/lessons/search-and-sort.ts` with EXACTLY the following:

```typescript
import Fuse, { type FuseResult } from "fuse.js";
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
      { name: "title", weight: 0.5 },
      { name: "summary", weight: 0.25 },
      { name: "tags", weight: 0.25 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    includeScore: false,
    includeMatches: true,
    minMatchCharLength: 2,
  });
}

function runSearch(
  fuse: Fuse<LessonMeta>,
  query: string,
): readonly FuseResult<LessonMeta>[] {
  const q = query.trim();
  if (q === "") return [];
  return fuse.search(q);
}

export function searchLessons(
  lessons: readonly LessonMeta[],
  query: string,
  fuse: Fuse<LessonMeta>,
): LessonMeta[] {
  if (query.trim() === "") return lessons as LessonMeta[];
  return runSearch(fuse, query).map((r) => r.item);
}

export type LessonHighlight = {
  titleRanges: ReadonlyArray<readonly [number, number]>;
  summaryRanges: ReadonlyArray<readonly [number, number]>;
  tagRanges: ReadonlyMap<string, ReadonlyArray<readonly [number, number]>>;
};

export function buildHighlightMap(
  fuse: Fuse<LessonMeta>,
  query: string,
): Map<string, LessonHighlight> {
  const map = new Map<string, LessonHighlight>();
  const results = runSearch(fuse, query);
  for (const r of results) {
    const titleRanges: Array<readonly [number, number]> = [];
    const summaryRanges: Array<readonly [number, number]> = [];
    const tagRanges = new Map<string, Array<readonly [number, number]>>();
    for (const m of r.matches ?? []) {
      const indices = m.indices.map(
        ([s, e]) => [s, e + 1] as readonly [number, number],
      );
      if (m.key === "title") {
        titleRanges.push(...indices);
      } else if (m.key === "summary") {
        summaryRanges.push(...indices);
      } else if (m.key === "tags" && typeof m.value === "string") {
        const existing = tagRanges.get(m.value) ?? [];
        existing.push(...indices);
        tagRanges.set(m.value, existing);
      }
    }
    map.set(r.item.id, { titleRanges, summaryRanges, tagRanges });
  }
  return map;
}

export function normalizeRanges(
  ranges: ReadonlyArray<readonly [number, number]>,
  textLength: number,
): ReadonlyArray<readonly [number, number]> {
  const clamped: Array<readonly [number, number]> = [];
  for (const [start, rawEnd] of ranges) {
    if (start < 0) continue;
    const end = Math.min(rawEnd, textLength);
    if (start >= end) continue;
    clamped.push([start, end]);
  }
  clamped.sort((a, b) => a[0] - b[0]);
  const merged: Array<readonly [number, number]> = [];
  for (const r of clamped) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) {
      merged[merged.length - 1] = [last[0], Math.max(last[1], r[1])];
    } else {
      merged.push(r);
    }
  }
  return merged;
}
```

Key notes for the engineer:
- Fuse's `indices` are inclusive `[start, end]` integer pairs. We convert to half-open `[start, end + 1)` ranges so `text.slice(start, end)` works as expected in the renderer.
- `m.value` is the matched string within the array (for the `tags` key, it's the specific tag). We key `tagRanges` by that value.
- `runSearch` returns the typed Fuse result array; downstream callers project it.

- [ ] **Step 2: Run the tests — confirm all pass**

Run:

```bash
npm test -- src/lib/lessons/search-and-sort.test.ts
```

Expected: all 31 tests pass (17 pre-existing + 14 new: tag search ×1, normalizeRanges ×8, buildHighlightMap ×5).

- [ ] **Step 3: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/lessons/search-and-sort.ts
git commit -m "feat(lessons): index tags + add highlight helpers (buildHighlightMap, normalizeRanges)"
```

---

## Task 3: Build `HighlightedText` component

**Files:**
- Create: `src/components/reading/highlighted-text.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/reading/highlighted-text.tsx` with EXACTLY:

```typescript
"use client";

import { Fragment } from "react";
import { normalizeRanges } from "@/lib/lessons/search-and-sort";
import { cn } from "@/lib/utils";

const DEFAULT_MARK_CLASS =
  "rounded-sm bg-yellow-200/70 px-0.5 text-foreground dark:bg-yellow-400/25";

export function HighlightedText({
  text,
  ranges,
  className,
  markClassName,
}: {
  text: string;
  ranges?: ReadonlyArray<readonly [number, number]>;
  className?: string;
  markClassName?: string;
}) {
  const normalized = normalizeRanges(ranges ?? [], text.length);
  if (normalized.length === 0) {
    return <span className={className}>{text}</span>;
  }
  const segments: Array<{ text: string; mark: boolean }> = [];
  let cursor = 0;
  for (const [start, end] of normalized) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), mark: false });
    }
    segments.push({ text: text.slice(start, end), mark: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), mark: false });
  }
  return (
    <span className={className}>
      {segments.map((s, i) =>
        s.mark ? (
          <mark key={i} className={cn(DEFAULT_MARK_CLASS, markClassName)}>
            {s.text}
          </mark>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </span>
  );
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Lint the new file**

Run:

```bash
npx eslint src/components/reading/highlighted-text.tsx
```

Expected: no issues.

- [ ] **Step 4: Commit**

```bash
git add src/components/reading/highlighted-text.tsx
git commit -m "feat(reading): add HighlightedText primitive with marker styling"
```

---

## Task 4: Wire highlights into `LessonCard`

**Files:**
- Modify: `src/components/reading/lesson-card.tsx`

- [ ] **Step 1: Replace the file contents**

Replace `src/components/reading/lesson-card.tsx` with EXACTLY:

```typescript
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonMeta } from "@/lib/lessons/types";
import type { Attempt } from "@/lib/db/types";
import type { LessonHighlight } from "@/lib/lessons/search-and-sort";
import { BookmarkButton } from "./bookmark-button";
import { HighlightedText } from "./highlighted-text";

const LEVEL_CLASS: Record<LessonMeta["level"], string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

function orderTags(
  tags: readonly string[],
  highlight: LessonHighlight | undefined,
): string[] {
  if (!highlight || highlight.tagRanges.size === 0) return tags.slice();
  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const t of tags) {
    if (highlight.tagRanges.has(t)) matched.push(t);
    else unmatched.push(t);
  }
  return [...matched, ...unmatched];
}

export function LessonCard({
  lesson,
  bestAttempt,
  highlight,
}: {
  lesson: LessonMeta;
  bestAttempt?: Attempt;
  highlight?: LessonHighlight;
}) {
  const orderedTags = orderTags(lesson.tags, highlight);
  const visibleTags = orderedTags.slice(0, 3);
  const overflow = orderedTags.length - visibleTags.length;
  return (
    <div className="group relative rounded-lg border bg-card text-card-foreground transition-shadow hover:shadow-md">
      <Link
        href={`/reading/${lesson.id}`}
        className="block rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start justify-between gap-2 pr-8">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            <HighlightedText text={lesson.title} ranges={highlight?.titleRanges} />
          </h3>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[0.7rem] font-semibold",
              LEVEL_CLASS[lesson.level],
            )}
          >
            {lesson.level}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          <HighlightedText text={lesson.summary} ranges={highlight?.summaryRanges} />
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap gap-1 text-muted-foreground">
            {visibleTags.map((t) => (
              <span key={t}>
                #<HighlightedText text={t} ranges={highlight?.tagRanges.get(t)} />
              </span>
            ))}
            {overflow > 0 && <span>+{overflow}</span>}
          </div>
          {bestAttempt ? (
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-medium text-secondary-foreground">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              Best {bestAttempt.score}/{bestAttempt.total}
            </span>
          ) : (
            <span className="text-muted-foreground">Not started</span>
          )}
        </div>
      </Link>
      <BookmarkButton lessonId={lesson.id} variant="card" />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Lint the file**

Run:

```bash
npx eslint src/components/reading/lesson-card.tsx
```

Expected: no issues.

- [ ] **Step 4: Run all unit tests (no regression)**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/reading/lesson-card.tsx
git commit -m "feat(reading): highlight matched ranges and prioritize matched tags in LessonCard"
```

---

## Task 5: Pass highlight map from the page

**Files:**
- Modify: `src/app/(app)/reading/page.tsx`

- [ ] **Step 1: Add the import and the memo, then pass the prop**

Open `src/app/(app)/reading/page.tsx`. Locate the import block from `@/lib/lessons/search-and-sort` (around lines 16–22 in the existing file):

```typescript
import {
  buildFuse,
  searchLessons,
  sortLessons,
  SORT_OPTIONS,
  type SortBy,
} from "@/lib/lessons/search-and-sort";
```

Replace it with:

```typescript
import {
  buildFuse,
  buildHighlightMap,
  searchLessons,
  sortLessons,
  SORT_OPTIONS,
  type SortBy,
} from "@/lib/lessons/search-and-sort";
```

Then locate the `fuse` memo (look for `const fuse = useMemo(() => buildFuse(filtered), [filtered]);`) and add the new `highlights` memo immediately after it. Replace:

```typescript
  const fuse = useMemo(() => buildFuse(filtered), [filtered]);

  const searched = useMemo(
    () => searchLessons(filtered, query, fuse),
    [filtered, query, fuse],
  );
```

with:

```typescript
  const fuse = useMemo(() => buildFuse(filtered), [filtered]);

  const highlights = useMemo(() => buildHighlightMap(fuse, query), [fuse, query]);

  const searched = useMemo(
    () => searchLessons(filtered, query, fuse),
    [filtered, query, fuse],
  );
```

Then locate the lesson grid render block (the `display.map` block near the end of the JSX). Replace:

```tsx
          {display.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              bestAttempt={bestByLesson?.get(lesson.id)}
            />
          ))}
```

with:

```tsx
          {display.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              bestAttempt={bestByLesson?.get(lesson.id)}
              highlight={highlights.get(lesson.id)}
            />
          ))}
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Lint**

Run:

```bash
npm run lint 2>&1 | tail -10
```

Expected: 5 errors total (all pre-existing in `tag-filter-row.tsx`, `use-local-storage.ts`, `mobile-sidebar.tsx`). No new errors in `page.tsx`.

- [ ] **Step 4: Run all unit tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/reading/page.tsx
git commit -m "feat(reading): pass highlight map from hub page to LessonCard"
```

---

## Task 6: Manual browser verification

**Files:**
- None (browser-only).

- [ ] **Step 1: Ensure dev server is running**

If `npm run dev` is not already running, start it. Otherwise it auto-reloads on file changes.

- [ ] **Step 2: Open the reading hub**

Visit `http://localhost:4600/reading`.

- [ ] **Step 3: Verify title highlight**

1. Type a word that appears in a lesson title (a noun from a visible card). The matching substring in each result card's title renders with a yellow background.
2. Clear the query — highlights disappear.

- [ ] **Step 4: Verify summary highlight**

1. Type a word that appears only in summaries. Result cards show the match highlighted inside the summary line.

- [ ] **Step 5: Verify tag search + highlight**

1. Pick a tag that exists on at least one lesson (look at any card's `#tag1 #tag2 …`).
2. Type that tag's text. Lessons with that tag appear in results.
3. On each result card, the matched tag chip shows up in the first 3 visible chips (even if it was previously hidden), and the matched characters within the tag are highlighted.
4. The leading `#` is NOT highlighted — only the tag text itself.

- [ ] **Step 6: Verify typo tolerance still highlights**

1. Type a deliberately misspelled word (drop one letter). The intended lesson surfaces and the (close-but-not-exact) characters are highlighted.

- [ ] **Step 7: Verify dark mode**

Toggle dark mode. The yellow highlight should remain legible (`bg-yellow-400/25` adjusts for the darker surface). Foreground text reads cleanly against it.

- [ ] **Step 8: Verify no highlight when not searching**

Clear the search input. Title / summary / tags render plain — no `<mark>` elements. Tags revert to the lesson's original order.

- [ ] **Step 9: Verify sort + highlight together**

With a non-empty query, switch sort between Name / Level / Random — highlights persist across re-sorts.

No commit for this task — verification only.

---

## Self-Review Notes

Cross-checked against the spec's Verification Checklist:

- ✅ Type a tag value → lessons with that tag appear (Task 1 test + Task 6 Step 5).
- ✅ Title match highlighted (Task 4 wires `HighlightedText` over title; Task 6 Step 3).
- ✅ Summary match highlighted (Task 4 + Task 6 Step 4).
- ✅ Tag match highlighted + reordered to visible 3 (Task 4 `orderTags` + Task 6 Step 5).
- ✅ Hidden (4th+) tag surfaces when matched (Task 4 `orderTags` moves matched tags to front; Task 6 Step 5).
- ✅ Clearing the query removes highlights + restores tag order (Task 4 `orderTags` returns `tags.slice()` when no highlight; Task 6 Step 8).
- ✅ Dark mode legible (Task 3 `dark:bg-yellow-400/25`; Task 6 Step 7).
- ✅ All tests pass + tsc + lint clean (Tasks 1, 2, 4, 5).

Type / name consistency: `LessonHighlight`, `buildHighlightMap`, `normalizeRanges`, `runSearch`, `HighlightedText`, `orderTags` — same names across tasks.
