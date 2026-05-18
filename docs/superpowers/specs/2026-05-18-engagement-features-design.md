# Engagement features — design spec

**Date:** 2026-05-18
**Status:** Approved, in implementation
**Scope:** Four learner-facing features that live alongside the existing Reading page: bookmarks, vocab list, streak counter, per-lesson notes.

## 1. Goals

Give the learner reasons to return: a way to flag lessons they want to revisit, a personal vocab list grown from annotation popovers, a visible reward for studying consecutive days, and a place to jot notes per lesson.

All four ship together because they share a Dexie migration. UI is added incrementally and never breaks existing surfaces.

## 2. Out of scope (explicit)

- Cloud sync or cross-device backup of any of these features.
- Vocab spaced-repetition, flashcards, or quizzes (future feature on top of the same `vocab` table).
- Streak goals, reminders, push notifications.
- Rich-text / markdown notes — plain text only.
- Sharing vocab lists between profiles.
- Bookmarks/vocab/notes for the four "Coming soon" skill pages — out of scope today, but the schemas are skill-agnostic so they're ready when those pages ship.

## 3. UX decisions (confirmed)

| Decision | Value |
|---|---|
| Vocab placement | Top-level sidebar item between Speaking and the theme toggle. Cross-skill from day one. |
| Bookmarks UI | Star icon on each lesson card + lesson detail header. "Favorites only" filter chip on the hub. |
| Streak definition | At least one completed `Attempt` per local-midnight day, any score. Resets after a missed day. |
| Notes scope | Plain text, per `(profile, lesson)` (NOT per attempt). 1-second debounced auto-save. |
| Vocab dedup | Case-insensitive by `phrase`. Re-saving the same word silently no-ops + toasts "Already in your vocab". |
| Vocab CSV export | Yes — `phrase, meaningVi, pronunciation, exampleEn, sourceLesson, addedAt`. |

## 4. Data layer (Dexie v4)

Three new tables. Migration is purely additive — registers the stores; no backfill needed.

```ts
bookmarks   PK: [profileId+lessonId]
  // { profileId, lessonId, createdAt }

vocab       PK: id (uuid)
            INDEX: [profileId+phraseLower]              // case-insensitive dedup key
            INDEX: [profileId+sourceLessonId]
            INDEX: [profileId+addedAt]
  // { id, profileId, phrase, phraseLower, meaningVi,
  //   pronunciation?, exampleEn?, sourceLessonId, addedAt }

notes       PK: [profileId+lessonId]
  // { profileId, lessonId, text, updatedAt }
```

Streak does **not** get its own table — derived from `attempts`.

`phraseLower` is stored alongside `phrase` because Dexie's compound indexes are exact-match; storing the lowercased copy lets the `[profileId+phraseLower]` index serve the dedup check in one query.

### TypeScript types (`src/lib/db/types.ts`)

```ts
export type Bookmark = {
  profileId: string;
  lessonId: string;
  createdAt: number;
};

export type VocabEntry = {
  id: string;
  profileId: string;
  phrase: string;
  phraseLower: string;
  meaningVi: string;
  pronunciation?: string;
  exampleEn?: string;
  sourceLessonId: string;
  addedAt: number;
};

export type Note = {
  profileId: string;
  lessonId: string;
  text: string;
  updatedAt: number;
};
```

## 5. Bookmarks

### Star toggle

- `BookmarkButton` (new shared component) — small star icon with filled/outlined states. Used in both `LessonCard` (top-right overlay above the level badge) and the lesson detail header.
- Click handler `toggleBookmark(lessonId)` upserts/deletes from the `bookmarks` table. On the card variant, `e.preventDefault()` + `e.stopPropagation()` so the surrounding `<Link>` doesn't navigate.

### Hub filter

- A new `★ Favorites only` chip appears at the end of the Level chip row. Single toggle, no multi-select.
- URL state: `?favorites=1`. Persisted across reloads / sharing.
- When active, the lesson grid filters to `lessons.filter(l => bookmarks.has(l.id))`. Combines with the existing level + tag filters.

### Hooks

- `useBookmarks()` — `useLiveQuery` returning `Set<string>` of bookmarked lesson IDs for the active profile.
- `useIsBookmarked(lessonId): boolean` — thin wrapper.
- `useToggleBookmark()` — returns `(lessonId: string) => Promise<void>`.

## 6. Vocab list

### Save flow

- `PassageAnnotation` popover gains a `+ Save to vocab` button below the meaning / pronunciation / example block.
- Clicking saves a `VocabEntry` with all the annotation data + the current `lessonId`. On dedup hit, toast "Already in your vocab".
- The button is replaced by a muted `✓ Saved` label after a successful save (per-popover state) so the user sees confirmation without dismissing the popover.

### `/vocab` page

```
Header: "My vocab" + total count + Export CSV button
Filter row:
  - Search input (filters by phrase OR meaningVi, case-insensitive substring)
  - Source-lesson dropdown (filter by single lesson)
  - Sort dropdown ("Recently added" default, "Alphabetical")
Table:
  Phrase | Meaning (Vi) | Pronunciation | Source lesson (link) | Added | × delete
```

- Search + sort happen client-side after fetching the full list — even at thousands of entries this stays fast.
- × deletes with a 5-second "Undo" toast (uses Sonner's `toast.success(..., { action: { label: "Undo", onClick: () => restore() } })`).
- Export CSV: client-side blob download, no server. `text/csv` with the columns listed above.

### Empty state

"You haven't saved any vocab yet. Click '+ Save to vocab' on any underlined word in a lesson."

### Sidebar nav

`NAV_ITEMS` in `nav-config.ts` gains a new entry between Speaking and the theme toggle (which lives below the nav list in the sidebar footer):

```ts
{ href: "/vocab", label: "Vocab", icon: BookmarkPlus }   // or BookOpenCheck
```

No "Soon" badge — the page is real from day one.

### Hooks

- `useVocab(filter?: { lessonId?: string; query?: string; sort?: "recent"|"alpha" }): VocabEntry[]` — `useLiveQuery` returning the filtered + sorted list for the active profile.
- `useSaveVocab()` — returns `(entry: Omit<VocabEntry, "id"|"profileId"|"addedAt"|"phraseLower">) => Promise<{ saved: boolean; reason?: "duplicate" }>`. Caller toasts based on the result.
- `useDeleteVocab()` — returns `(id: string) => Promise<VocabEntry>`. Returns the deleted row so the undo toast can restore it via `saveAttempt(entry)` semantics — actually re-insert the original entry.

## 7. Streak counter

### Algorithm

Pure derivation from `attempts` rows.

```ts
function computeStreak(attempts: Attempt[], now = Date.now()):
  { current: number; longest: number; lastActiveDate: string | null }
```

1. For each attempt, compute its local-date string (`YYYY-MM-DD`) from `completedAt`.
2. Build the unique set of date strings.
3. Sort dates descending.
4. **Current streak**: starts at today's date. If today is not in the set, try yesterday (so a learner who studied yesterday but not yet today still sees the streak). Walk backward by one day; count consecutive days present in the set. Stop at the first gap.
5. **Longest streak**: scan the sorted date list, count the longest run of consecutive days.

The "yesterday grace" matters because the badge shouldn't reset to 0 just because the user opened the app before studying today.

### Hook

```ts
useStreak(): { current: number; longest: number; lastActiveDate: string | null }
```

Implemented with `useLiveQuery` over `attempts` filtered by active profile. Re-runs reactively when a new attempt is saved.

### UI — `StreakBadge`

Renders in the sidebar footer above the theme toggle:

```
[🔥 7-day streak]            <- when current > 0
[Start a streak]             <- when current === 0
```

- Tooltip on hover/tap: "Current: 7 days · Longest: 12 days · Last study: Today" (or `2 days ago` / a date).
- Padding + border so it visually groups with the theme toggle / content-zoom control row.

## 8. Per-lesson notes

### UI — `LessonNotes`

Collapsible card on the lesson detail page, **below the attempt history**:

```
[▼ My notes]                          <- header, click to collapse/expand
[<textarea, 4 rows default, auto-grow>]
[footer: "Saved · just now" | "Saving..."]
```

- Default expand state: expanded if a note exists, collapsed otherwise.
- Auto-save: 1-second debounce after the last keystroke. Status indicator switches between "Saving…" and "Saved · {relative time}".
- Empty textarea → calls `deleteNote(lessonId)` so empty rows don't accumulate in IndexedDB.
- Plain text only. No formatting toolbar. Multi-line allowed.

### Hooks

- `useNote(lessonId): { text: string; updatedAt: number | null }` — `useLiveQuery`.
- `useSetNote()` — returns `(lessonId: string, text: string) => Promise<void>`.

## 9. File structure

```
src/lib/db/
  types.ts                       MODIFY  + Bookmark, VocabEntry, Note
  client.ts                      MODIFY  v4 migration, 3 new stores
  queries.ts                     MODIFY  + bookmark/vocab/note CRUD
  use-bookmarks.ts               NEW
  use-vocab.ts                   NEW
  use-notes.ts                   NEW
  use-streak.ts                  NEW

src/components/reading/
  bookmark-button.tsx            NEW
  lesson-card.tsx                MODIFY  render BookmarkButton overlay
  passage-annotation.tsx         MODIFY  + "Save to vocab" button
  lesson-notes.tsx               NEW

src/app/(app)/reading/
  page.tsx                       MODIFY  + Favorites chip, ?favorites URL state
  [lessonId]/page.tsx            MODIFY  + BookmarkButton in header, + <LessonNotes /> below history

src/app/(app)/vocab/
  page.tsx                       NEW     /vocab route

src/components/vocab/
  vocab-table.tsx                NEW
  vocab-row.tsx                  NEW
  vocab-empty.tsx                NEW
  vocab-export-button.tsx        NEW     CSV download

src/components/app-shell/
  nav-config.ts                  MODIFY  + Vocab entry
  streak-badge.tsx               NEW
  sidebar.tsx                    MODIFY  render <StreakBadge /> above ThemeToggle

src/lib/streak.ts                NEW     pure computeStreak function
src/lib/streak.test.ts           NEW     unit tests for the algorithm
src/lib/csv.ts                   NEW     pure CSV-encoding helper (escapes commas/quotes/newlines)
src/lib/csv.test.ts              NEW
```

No new shadcn primitives needed.

## 10. Tests

Unit tests (vitest) for:

- `computeStreak`: today-only, yesterday-only, gap resets, multi-week longest, empty input, multiple attempts on the same day count once.
- `csv.encode`: simple values, values containing commas/quotes/newlines, empty fields, Vietnamese unicode.
- Dexie queries for the three new tables: insert, dedup behavior, delete, list filtering, sort.

UI verified manually against §11 acceptance criteria.

## 11. Acceptance criteria

1. **Bookmarks:** click star on a card → fills; appears in IndexedDB `bookmarks` table. Toggle "Favorites only" chip → only starred lessons show; URL is `/reading?favorites=1`; reload preserves state. Star on the lesson detail page is in sync with the card.
2. **Vocab save:** open an A1 lesson with "Vietnamese for hard words" toggle on → click "airport" → click "+ Save to vocab" → toast "Saved", button shows "✓ Saved". `/vocab` shows the row with source lesson link.
3. **Vocab dedup:** click "airport" in any other lesson with the same phrase annotation → toast "Already in your vocab"; no new row.
4. **Vocab delete + undo:** click × on a vocab row → row disappears + "Undo" toast. Click Undo within 5s → row reappears with original `addedAt`.
5. **Vocab CSV:** click Export CSV → browser downloads `vocab.csv` with the expected columns and Vietnamese diacritics intact (UTF-8 with BOM).
6. **Streak fresh:** in a brand-new IndexedDB (or after wiping) the sidebar shows `Start a streak`. Complete one lesson → updates to `🔥 1-day streak` without a route change.
7. **Streak continuity:** complete a second lesson the next day (simulate by manually editing an attempt's `completedAt`) → `🔥 2-day streak`. Skip a day → completing another lesson resets current to 1 while longest stays at 2.
8. **Notes:** on a lesson detail page, expand "My notes", type "tricky tense usage", wait 1s, see "Saved · just now". Reload → note persists, card auto-expands. Clear the textarea entirely → note is deleted from IndexedDB.
9. **No regression:** all existing Reading flows still work; previous attempts unchanged; tsc + lint + tests pass.
