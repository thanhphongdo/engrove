# Design Spec: Reading Hub — Sort & Search

## Context & Goal

`/reading` ([src/app/(app)/reading/page.tsx](../../../src/app/(app)/reading/page.tsx)) currently supports filtering by Level chips, Tag chips, and a Favorites toggle (state in URL search params). It has no sort control and no text search.

This adds two features:

1. **Order-by control** with three modes — **Name**, **Level**, **Random** — persisted in `localStorage`.
2. **Text search** over lesson `title` + `summary`, powered by **Fuse.js** for fuzzy matching.

The goal is to let learners (a) find a known lesson quickly by typing part of its title or summary, and (b) shape the catalogue order to their preference, with Random offering serendipity that re-rolls on refresh and on filter changes.

## Behaviour

### Sort

- Three modes: `Name`, `Level`, `Random`. Default = `Name`.
- Stored in `localStorage` under key `reading:sortBy`. Sort is a user preference, not a shareable URL state.
- **Name**: locale-aware compare of `lesson.title` (`Intl.Collator`).
- **Level**: A1 → A2 → B1 → B2 → C1, with `title` as tiebreaker.
- **Random**: Fisher–Yates shuffle seeded by a `randomSeed` value.

### Random re-shuffle semantics

A `randomSeed` is regenerated when:

- The component mounts (page load / refresh).
- Any **filter selection** changes: `selectedLevels`, `selectedTags`, or `favoritesOnly`.

The seed does **not** regenerate on:

- Search query changes (typing must not cause cards to jump).
- Unrelated re-renders.

Implementation: `useState(() => Math.random())` for the seed, with a `useEffect` whose deps array is `[selectedLevels.join(","), selectedTags.join(","), favoritesOnly]` and which calls `setSeed(Math.random())`.

Shuffle uses a seeded PRNG (`mulberry32`) so the resulting order is deterministic for a given `(seed, list)` pair — no flicker across re-renders.

### Search

- Powered by **Fuse.js**, indexing:
  - `title` (weight `0.7`)
  - `summary` (weight `0.3`)
- Options: `threshold: 0.35`, `ignoreLocation: true`, `includeScore: false`, `minMatchCharLength: 2`.
- Fuse instance memoized on `lessons` (rebuilt only when the lesson list changes).
- Search runs **after** the filter step and **before** the sort step.
- Empty / whitespace-only query → skip Fuse, return the filtered list unchanged.
- Search state is **component-local** (`useState`). Not in URL, not in `localStorage` — query is ephemeral.

### Search + Sort interaction

- When the user is searching (non-empty query):
  - **Random**: ignored — Fuse's relevance order is preserved (per user direction).
  - **Name**: Fuse results are re-sorted by name.
  - **Level**: Fuse results are re-sorted by level.
- When the user is **not** searching: all three sort modes apply normally to the filtered list.

### Empty / edge states

- Filter result empty, no search: existing copy — "No lessons match these filters."
- Search result empty: new copy — "No lessons match your search."
- "Clear filters" button clears filter selections **and** the search query. It does **not** reset the sort preference (sort is sticky).

### Pipeline

```
lessons (from index)
  └─> filter (levels, tags, favorites)
        └─> search (Fuse, if query non-empty)
              └─> sort (Name | Level | Random — except Random skipped when searching)
                    └─> render grid
```

## UI

### Search input

- Above the existing filter rows, full-width on mobile, capped width on desktop.
- Uses the existing `Input` primitive ([src/components/ui/input.tsx](../../../src/components/ui/input.tsx)).
- `lucide-react` `Search` icon as a left adornment; `X` clear button on the right when the query is non-empty.
- Placeholder: "Search lessons by name or summary…".
- `aria-label="Search lessons"`.

### Sort control

- **Shadcn `Select` dropdown** ([src/components/ui/select.tsx](../../../src/components/ui/select.tsx)) styled as a small chip-height trigger to match the existing filter chip row.
- Placed on the same row as the Level chips, right-aligned (or wrapping below on narrow viewports).
- Label format: `Sort: Name` / `Sort: Level` / `Sort: Random`.

### Row layout

```
[ Search input ............................. ]
[ Level: A1 A2 B1 B2 C1   ★ Favorites          Sort: Name ▾ ]
[ Tag chips .............................................   Clear filters ]
```

## Files

### New files

- [src/components/reading/lesson-search.tsx](../../../src/components/reading/lesson-search.tsx) — controlled search input with `Search` icon and clear button.
- [src/components/reading/sort-select.tsx](../../../src/components/reading/sort-select.tsx) — shadcn `Select` trigger for the three sort modes.
- [src/lib/lessons/search-and-sort.ts](../../../src/lib/lessons/search-and-sort.ts) — pure helpers:
  - `type SortBy = "name" | "level" | "random"`
  - `mulberry32(seed: number): () => number`
  - `shuffle<T>(arr: T[], rng: () => number): T[]` — Fisher–Yates, non-mutating
  - `sortLessons(lessons, sortBy, seed): LessonMeta[]`
  - `buildFuse(lessons): Fuse<LessonMeta>`
  - `searchLessons(lessons, query, fuse): LessonMeta[]`

### Changed files

- [src/lib/use-local-storage.ts](../../../src/lib/use-local-storage.ts) — add `useLocalStorageString<T extends string>(key, defaultValue, allowed?: readonly T[])`. Same hydration pattern as the existing `useLocalStorageBoolean`: returns `defaultValue` on first render, then reads from storage in an effect. If `allowed` is provided, ignore stored values not in that set.
- [src/app/(app)/reading/page.tsx](../../../src/app/(app)/reading/page.tsx) — wire up `query` state, `sortBy` via `useLocalStorageString`, `randomSeed` state + effect, compose `filter → search → sort`, render the new `LessonSearch` and `SortSelect` components, update empty-state copy, extend "Clear filters" to clear the query.

### Dependencies

- Add `fuse.js` (~6KB gz) — fuzzy search with field weighting. Industry-standard for this UX. Already covered by user direction.

## Testing

Unit tests (Vitest, alongside existing tests):

- `mulberry32`
  - Same seed → same sequence (determinism).
  - Different seeds → different sequences.
- `shuffle`
  - Non-mutating (input array unchanged).
  - Same seed + same input → same output.
  - Output is a permutation of the input.
- `sortLessons`
  - **Name**: returns titles in locale-aware ascending order; handles diacritics.
  - **Level**: A1 → C1; ties broken by title.
  - **Random**: deterministic given seed; different seeds → different orders.
- `searchLessons`
  - Empty query → returns input list unchanged (reference equality OK).
  - Whitespace-only query → same as empty.
  - Matches in `title` and in `summary`.
  - Title matches outrank summary matches (weight check).
  - No-match returns `[]`.
  - Typo tolerance: query with one transposed/missing char still matches.

Component / integration: rely on existing manual flow; no React Testing Library tests required for the trivial wrappers (`LessonSearch`, `SortSelect`) beyond ensuring they render without error if a smoke test is cheap.

## Accessibility

- Search input has a visible `Search` icon and `aria-label="Search lessons"`.
- Clear button is a real `<button type="button">` with `aria-label="Clear search"`.
- Sort `Select` inherits Radix's accessible combobox semantics via shadcn — label is conveyed via the trigger text (`Sort: …`).

## Out of scope

- Persisting search query across reloads.
- Server-side / indexed search.
- Sorting by progress (best score, completion). Could be added later as `sortBy: "progress"` without breaking the storage key.
- Highlighting matched terms in the lesson card.

## Verification Checklist

- [ ] Reload page — last-selected sort mode is restored from `localStorage`.
- [ ] Switch sort modes — list re-orders without page reload.
- [ ] Random mode: refresh → order changes; toggle a Level chip → order changes; type in search → order does not change.
- [ ] Search query filters by title and by summary; clearing the query restores the full filtered list.
- [ ] When searching with `Random` selected, results appear in Fuse relevance order.
- [ ] When searching with `Name` or `Level` selected, results appear in that sort order.
- [ ] "Clear filters" clears Level/Tag/Favorites/search query but keeps the sort mode.
- [ ] Empty-state copy distinguishes "no filter match" from "no search match".
- [ ] No new TypeScript errors; `npm run lint` and `npx tsc --noEmit` clean.
- [ ] All new unit tests pass.
