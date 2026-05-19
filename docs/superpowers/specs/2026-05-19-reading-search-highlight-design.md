# Design Spec: Reading Hub — Search Tags + Match Highlighting

## Context & Goal

Builds on the just-shipped search/sort feature (spec: [2026-05-19-reading-sort-and-search-design.md](./2026-05-19-reading-sort-and-search-design.md)). Two improvements:

1. **Include `tags` in the Fuse search index** so a query like `coffee` matches lessons tagged `#coffee` even when the word isn't in the title/summary.
2. **Highlight matched character ranges** in the lesson card's title, summary, and tags so the user can see *why* a lesson was returned.

Goal is a tighter, more diagnosable search UX: matching is broader (tags-aware), and results visually explain themselves.

## Behaviour

### Search keys

Fuse is configured with three keys. Weights are *relative* and drive ranking:

```
title:    0.50
summary:  0.25
tags:     0.25
```

Tags index is array-aware — Fuse's built-in nested/array support handles `LessonMeta.tags: string[]`. A match on any tag string contributes to the lesson's relevance.

Other Fuse options unchanged: `threshold: 0.35`, `ignoreLocation: true`, `minMatchCharLength: 2`. `includeMatches` flips to `true`.

### Highlight pipeline

When `query` is non-empty, the page derives a `Map<lessonId, LessonHighlight>` where:

```typescript
type LessonHighlight = {
  titleRanges: ReadonlyArray<readonly [number, number]>;
  summaryRanges: ReadonlyArray<readonly [number, number]>;
  // For each tag string that had a match, the char ranges within that tag.
  tagRanges: ReadonlyMap<string, ReadonlyArray<readonly [number, number]>>;
};
```

Pure helper `buildHighlightMap(fuse, query): Map<string, LessonHighlight>` lives next to the other search helpers. When `query` is empty, the helper returns an empty map and the cards render plain text (current behaviour).

Highlight data is a **side channel** — `searchLessons` keeps its existing `LessonMeta[]` return shape, so the downstream sort pipeline (`sortLessons`) is unchanged. The map is built in parallel from the same `fuse.search()` call.

To avoid running Fuse twice, refactor `searchLessons` + `buildHighlightMap` to share a single internal `fuse.search()` invocation: introduce a private `runSearch(fuse, query)` that returns the raw `FuseResult<LessonMeta>[]`. Public `searchLessons` calls it and projects to `LessonMeta[]`; public `buildHighlightMap` calls it and projects to the map. The page invokes each helper once and pays for one Fuse search per render.

### Rendering

#### Range-merge helper (pure)

Range normalization lives in [src/lib/lessons/search-and-sort.ts](../../../src/lib/lessons/search-and-sort.ts) so it can be unit-tested without React:

```typescript
export function normalizeRanges(
  ranges: ReadonlyArray<readonly [number, number]>,
  textLength: number,
): ReadonlyArray<readonly [number, number]>
```

Steps: clamp `end` to `textLength`, drop ranges where `start >= end` or `start < 0`, sort by `start`, merge overlapping/adjacent ranges.

#### `HighlightedText` primitive

Component at [src/components/reading/highlighted-text.tsx](../../../src/components/reading/highlighted-text.tsx):

```typescript
function HighlightedText({
  text,
  ranges,
  className,
  markClassName,
}: {
  text: string;
  ranges?: ReadonlyArray<readonly [number, number]>;
  className?: string;
  markClassName?: string;
}): JSX.Element
```

- Calls `normalizeRanges(ranges, text.length)` and renders alternating plain `<span>` and `<mark>` segments.
- Default `markClassName`: `"rounded-sm bg-yellow-200/70 px-0.5 text-foreground dark:bg-yellow-400/25"`.
- Uses `<mark>` for semantic + a11y default (browsers and assistive tech recognize it as a highlighted phrase).
- Missing or empty `ranges` → returns plain `<span>{text}</span>` so the component is safe to drop in everywhere even when no search is active.

Because the merge/clamp logic is in a tested pure helper, the component itself contains only trivial render plumbing and follows the existing "only test pure logic" convention — no React Testing Library tests needed.

#### `LessonCard`

Accepts a new optional `highlight?: LessonHighlight` prop.

- **Title**: `<HighlightedText text={lesson.title} ranges={highlight?.titleRanges ?? []} />`
- **Summary**: same pattern with `summaryRanges`.
- **Tags**:
  - If `highlight` is provided: reorder `lesson.tags` so any tag present in `highlight.tagRanges` comes first (stable order within each group). Then take the first 3 visible tags as before.
  - Each visible tag: if it's in `tagRanges`, render the tag string via `HighlightedText` with those ranges. Otherwise plain text. The leading `#` is rendered outside `HighlightedText` (it's not part of the searched value, so no highlight on it).

Plain `<span>` markup stays for non-search rendering — `highlight` is `undefined` whenever the query is empty, and the card behaves exactly as today.

### Page wiring

In [src/app/(app)/reading/page.tsx](../../../src/app/(app)/reading/page.tsx):

- Add `const highlights = useMemo(() => buildHighlightMap(fuse, query), [fuse, query])`.
- Pass `highlight={highlights.get(lesson.id)}` to each `<LessonCard>`.

`highlights` returns an empty `Map` when the query is empty (helper handles this), so no conditional rendering at the page level.

### Edge cases

- **Overlapping ranges** from Fuse (rare with `minMatchCharLength: 2`) — merge in `HighlightedText` before rendering.
- **Out-of-bounds ranges** (defensive): clamp `end` to `text.length`; drop ranges with `start >= end` after clamping. Tested.
- **Empty `text`** — return an empty `<span>`.
- **Empty `ranges`** — return `<span>{text}</span>` (no `<mark>`).

## Files

### New

- [src/components/reading/highlighted-text.tsx](../../../src/components/reading/highlighted-text.tsx) — the `HighlightedText` primitive (described above).

### Changed

- [src/lib/lessons/search-and-sort.ts](../../../src/lib/lessons/search-and-sort.ts):
  - `buildFuse` gains a `tags` key (weight `0.25`); title weight drops to `0.5`, summary stays `0.25`. `includeMatches: true`.
  - Extract a private `runSearch(fuse, query)` returning `readonly FuseResult<LessonMeta>[]` (or `[]` for empty query).
  - `searchLessons` becomes `runSearch(...).map(r => r.item)` (keeping its current public signature).
  - Export `type LessonHighlight = { titleRanges; summaryRanges; tagRanges }` and `buildHighlightMap(fuse, query): Map<string, LessonHighlight>`.
  - Export `normalizeRanges(ranges, textLength)` (pure, used by the `HighlightedText` component).
- [src/lib/lessons/search-and-sort.test.ts](../../../src/lib/lessons/search-and-sort.test.ts) — extend tests:
  - `searchLessons` matches a tag-only query (no title/summary hit, tag hit only).
  - `buildHighlightMap` returns an empty map for empty/whitespace query.
  - `buildHighlightMap` returns ranges keyed by lesson id with correct `key`-based partitioning into `titleRanges` / `summaryRanges` / `tagRanges`.
  - `buildHighlightMap` returns `[]` ranges for a lesson that didn't match.
- [src/components/reading/lesson-card.tsx](../../../src/components/reading/lesson-card.tsx) — accept `highlight?: LessonHighlight`; render title/summary via `HighlightedText`; reorder + highlight tags as described.
- [src/app/(app)/reading/page.tsx](../../../src/app/(app)/reading/page.tsx) — compute `highlights` memo from `fuse` + `query`; pass `highlight` to each `LessonCard`.

### Unchanged

- `LessonSearch`, `SortSelect`, `useLocalStorageString`, `useLocalStorageBoolean`, the sort logic, the randomization seed effect, all filter handling, "Clear filters" semantics.

## UI

### Highlight visual

```
bg-yellow-200/70 dark:bg-yellow-400/25  +  rounded-sm  +  px-0.5  +  text-foreground
```

Soft yellow background, full-text-color foreground (no contrast loss). Rounded corners + slight horizontal padding give it a "marker pen" feel without crowding adjacent letters. Survives dark mode.

### Tag highlight nuance

The `#` prefix is rendered outside the highlight span, so the visual emphasis is on the tag text only. Example for a tag `coffee` matched on query `cof`:

```
#[cof]fee
```

The `#` and the trailing `fee` stay plain; `cof` gets the marker background.

## Testing

Unit tests added to [src/lib/lessons/search-and-sort.test.ts](../../../src/lib/lessons/search-and-sort.test.ts):

1. `searchLessons` matches on tags only. Fixture: a lesson with no query-related word in title/summary but the query in `tags`. Query returns that lesson.
2. `buildHighlightMap`:
   - Empty / whitespace query → empty map.
   - Returns a map keyed by `lesson.id` with `titleRanges`, `summaryRanges`, `tagRanges` correctly partitioned (e.g., a lesson that matches in title only has non-empty `titleRanges`, empty `summaryRanges`, empty `tagRanges`).
   - For a tag match, `tagRanges` is keyed by the exact tag string and contains the right `[start, end]` tuples.
   - Lessons that didn't match are absent from the map (i.e., callers always do `map.get(id) ?? defaults`).
3. `normalizeRanges`:
   - Empty input → empty output.
   - Single in-bounds range passes through unchanged.
   - `end` past `textLength` is clamped.
   - `start < 0` drops the range.
   - `start >= end` (after clamping) drops the range.
   - Overlapping ranges merge into one.
   - Adjacent ranges (`[0,3]`, `[3,5]`) merge into `[0,5]`.
   - Result is sorted by `start`.
4. `mulberry32`, `shuffle`, `sortLessons` tests are unchanged.

## Accessibility

- `<mark>` element conveys highlight semantics (AT-readable as "highlighted").
- Color contrast: `text-foreground` on `bg-yellow-200/70` and `bg-yellow-400/25` (dark) both meet WCAG AA for normal text against the card background. (Verified in dev tools by eye; if a Lighthouse audit later flags it, we'll dial the alpha up.)
- Re-ordering tags doesn't break keyboard nav — tags aren't interactive in the card.

## Out of scope

- Server-side / indexed search.
- Highlighting in the search input itself.
- A "no fuzzy match — exact only" toggle.
- Boosting recently completed lessons.
- Localizing the highlight color.

## Verification Checklist

- [ ] Type `coffee` (or any tag value) — lessons whose `tags` contain `coffee` appear in results.
- [ ] Title that contains the query has the matched substring rendered with the yellow highlight.
- [ ] Summary that contains the query has the matched substring highlighted.
- [ ] A tag that contains the query is highlighted, and it bubbles up to the first-3 visible tags on its card.
- [ ] Lessons where the match is on a hidden (4th+) tag still surface that tag thanks to the reorder rule.
- [ ] Clearing the query removes all highlights and restores the original tag order.
- [ ] Dark mode renders highlights legibly.
- [ ] `npm test` — all existing tests pass plus the new `buildHighlightMap`, tag-search, and `HighlightedText` tests.
- [ ] `npx tsc --noEmit` and `npm run lint` clean (5 pre-existing errors remain — no new ones).
