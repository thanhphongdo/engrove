# Reading module — feature guide

Behavior reference for the Reading hub and the lesson detail page. Sections are grouped by surface (hub vs. detail) and ordered top-to-bottom roughly the way a user encounters them.

---

## Reading hub (`/reading`)

### Search

Free-text search bar above the filter chip row.

- Powered by [Fuse.js](https://fusejs.io) — fuzzy matches across `title` (weight 0.5), `summary` (0.25), and `tags` (0.25).
- Threshold `0.35`, location-independent, minimum 2-char match.
- When the search box has any non-empty query:
  - The lesson grid shows ranked Fuse matches; the "No lessons match your search" empty state appears if none match.
  - Matched ranges (`title`, `summary`, and individual `tags`) are highlighted on each card via the `HighlightedText` primitive.
  - When the active sort is `random`, the random order is suppressed so the user sees Fuse's relevance ranking instead.
- The query is local-only — it is **not** persisted in the URL (filters are; search is treated as ephemeral).

Implementation: [src/lib/lessons/search-and-sort.ts](../src/lib/lessons/search-and-sort.ts), [src/components/reading/lesson-search.tsx](../src/components/reading/lesson-search.tsx).

### Sort

Sort dropdown anchored to the right of the chip row.

| Option | Behavior |
| ------ | -------- |
| `name` (default) | Alphabetical by title using a case-insensitive Intl collator. |
| `level` | A1 → A2 → B1 → B2 → C1, then alphabetical by title within each level. |
| `random` | Stable shuffle using a `mulberry32` seed. The seed is re-rolled whenever any filter changes (levels / tags / favorites / status), so the same filter set always shows the same order until the user changes filters. |

- Persisted to `localStorage` under key `reading:sortBy`.
- When a search query is active, sort=`random` is bypassed in favor of Fuse's match ranking. Other sorts (`name`, `level`) are still applied on top of the searched subset.

Implementation: [src/lib/lessons/search-and-sort.ts](../src/lib/lessons/search-and-sort.ts), [src/components/reading/sort-select.tsx](../src/components/reading/sort-select.tsx).

### Filters

All filters except search are reflected in the URL query string (so a filtered view is shareable / bookmarkable / back-button-recoverable). The "Clear filters" link clears all of them at once.

- **Level** (`?levels=A1,A2,...`) — multi-select chip row, A1 through C1.
- **Tags** (`?tags=Letter,Craft,...`) — multi-select tag chip row, populated from the union of all lesson tags. Each chip carries a count.
- **Favorites** (`?favorites=1`) — single toggle. When on, only bookmarked lessons appear.
- **Status** (`?status=learning|learned`) — single-select between two chips, mutually exclusive (clicking the active chip clears it). Defined as:
  - **Learning** — there is a saved draft for this lesson (the user has started but not submitted, or submitted then began another attempt without finishing).
  - **Learned** — the user has at least one completed attempt (a Best score exists). The chip stays on for that lesson permanently until "Reset progress" wipes its attempts.
  - A lesson can match **both** chips independently — they are "is currently X" predicates, not a single state machine.

Drafts are read via the new `useDrafts()` hook ([src/lib/db/use-drafts.ts](../src/lib/db/use-drafts.ts)), which scans the `drafts` table by the existing `[profileId+lessonId]` compound index.

---

## Lesson detail page (`/reading/[lessonId]`)

### Header controls

The sticky header at top contains, left to right:

- Lesson title, level chip, tag chips, attempt counter.
- **Bookmark** (star) toggle.
- **Lesson timer** — see [Timer](#timer) below.
- **Hints** popover — toggles for vocab annotations, grammar notes, passage translation, per-question hint.
- **Layout toggle** — switches between stacked (single column) and two-column layouts. Persisted per-profile in IndexedDB.

The mobile menu (`<` `>` hamburger) is a transparent, absolute-positioned icon at the **top-right**; tapping it slides the navigation drawer in from the **left**. The header reserves no horizontal space for it — content flows underneath.

### Pin lesson content

A small pin icon (top-right of the passage section) toggles "pin content while scrolling".

- When **pinned**, the passage section becomes `sticky top-40` (md+: `top-26`), with `max-h-[60vh]` and internal scroll.
- When **pinned + two-column layout** (`lg`+): max-height becomes `calc(100vh - 7rem)` so the passage fills the rest of the viewport beside the questions column.
- State is persisted to `localStorage` under `reading.lessonContentPinned`.

### Two-column grid

When the user selects two-column layout (`lg`+ only):

| Column | Row 1 | Row 2 |
| ------ | ----- | ----- |
| 1 (`1.2fr`) | Passage (spans rows 1–2) | _(continued)_ |
| 2 (`1fr`)   | Grammar notes (when toggled on) | Quiz (MCQ + cloze) |

Below `lg`, the grid collapses to single column (`flex flex-col`).

### Passage annotations

Highlighted vocab phrases in the passage are clickable. The popover shows:

- The phrase + IPA pronunciation.
- A 🔊 speaker icon — calls Web Speech API (`speechSynthesis`) to pronounce the phrase. Picks an `en-US` voice when available, cancels any in-flight speech before starting, and disables itself while speaking. Hidden on browsers without `speechSynthesis` support.
- Vietnamese meaning + optional English example.
- "Save to vocab" — adds the phrase to the user's vocab list. Repeated saves of the same phrase show "Already in vocab".

Implementation: [src/lib/use-speak.ts](../src/lib/use-speak.ts), [src/components/reading/passage-annotation.tsx](../src/components/reading/passage-annotation.tsx).

### Timer

State machine with three statuses and four explicit user actions:

```
   stopped ──[Begin]──▶ running ──[Pause]──▶ paused
      ▲          (fresh attempt)    ◀──[Resume]──
      └──── [Finish] ──────────────────────┘
```

| Status | Buttons visible |
| ------ | --------------- |
| Stopped (initial / after Finish) | `[▶ Begin]` |
| Running | `[⏸ Pause]` `[⏹ Finish]` |
| Paused (after Pause or after draft restore) | `[▶ Resume]` `[⏹ Finish]` |

Rules:

- `Begin` is **only** reachable from `stopped`. It always resets the clock to `00:00` and wipes any previous picks / review-mode state.
  - This is how "after submit, click Begin → start a fresh attempt" works.
- `Pause` ⇄ `Resume` — preserves elapsed time and all picks.
- `Finish` — preserves elapsed time but moves to `stopped`, arming the next `Begin` to reset. This is the "stop and start again ⇒ reset" rule.
- `Submit` internally calls `finish()`, so after submit the timer is stopped on the final duration; clicking `Begin` then starts a fresh attempt with no review highlighting.
- **Draft restoration** — when the user opens a lesson with a saved draft, the timer is hydrated in `paused` state (not stopped). So they see `[▶ Resume]` and continue from where they left off, **without** their picks getting wiped.

Implementation: [src/stores/timer-store.ts](../src/stores/timer-store.ts), tested in [src/stores/timer-store.test.ts](../src/stores/timer-store.test.ts).

### Answer gate (start-the-timer prompt)

Quiz answers are not editable while the timer is not running.

- Clicking a multiple-choice option or a cloze blank when `status !== "running"` opens an AlertDialog instead of changing the answer:
  - Status `stopped` → title "Start the timer to begin", primary action **Begin**.
  - Status `paused` → title "Resume the timer to continue", primary action **Resume**.
- Dialog has a "Not now" cancel — closes without changing anything.
- Triggering the primary action starts/resumes the timer and closes the dialog. The same click does **not** apply the attempted pick; the user must click the answer again now that the timer is running. (This avoids accidental "first click → activates timer AND selects answer" behavior.)

Implementation: [src/components/reading/quiz-section.tsx](../src/components/reading/quiz-section.tsx).

### Quiz review mode

After clicking **Submit**:

- All picks remain visible on the page (the QuizSection is **not** unmounted — see [Persistence-stability](#persistence-stability)).
- Each MC question shows a red-/green-bordered row:
  - The chosen option (if any) is tinted; correct = green ✓, wrong = red ✕.
  - The correct option is always highlighted in green with a ✓.
  - The Explanation paragraph appears below the question.
- Each cloze blank is replaced with a styled span in red or green, including the user's pick (or `—` if unanswered) and a ✓/✕ icon. The span carries a small `1.`, `2.`, `3.`, … prefix matching the numbered "Cloze answers" list below the passage. The Cloze answers list itself uses a plain top-border separator (no full box) to reduce visual nesting.
- Per-question hint buttons are hidden in review mode (the explanation provides the same value).
- The Quiz footer swaps from `[Submit]` to a "Retry" button + the score summary.
- Multiple-choice radios are also disabled in review mode (`<RadioGroup disabled>`).

To start another attempt, the user clicks **Begin** on the timer (the auto-reset effect handles the wipe) **or** the explicit **Retry** button in the footer (which calls `reset()` and leaves the timer in stopped state at `00:00`).

### Persistence-stability

The QuizSection's `key` is derived from `${lessonId}-${sessionEpoch}`, where `sessionEpoch` is a local counter incremented **only** when the user clicks "Abandon and start over" in the resume banner. It is **not** keyed on draft presence. This means:

- Submit → `deleteDraft()` → draft becomes absent → key unchanged → QuizSection state (including `mcResult` and picks) is preserved, so the review UI persists.
- Abandon → key changes → QuizSection remounts with empty initial picks.

### Reset lesson progress

A small "↻ Reset progress" link sits in the top-right of the **Attempt history** section.

- Confirmation dialog explains exactly what is deleted (attempts + draft + best score) and what is kept (bookmark, notes, saved vocab).
- One DB transaction in [`resetLessonProgress(profileId, lessonId)`](../src/lib/db/queries.ts):
  - Bulk-delete all rows in `attempts` for that `(profileId, lessonId)`.
  - Delete the single `drafts` row for that `(profileId, lessonId)`.
- Also calls `reset()` on the timer store so the header counter returns to `00:00 stopped`.
- The section only renders when `attempts.length > 0`, so the entry point self-hides once everything is reset.

### Quiz footer / Submit button

- The **Submit** button is centered horizontally in its row (the footer wraps it in `flex justify-center`).
- Width: full-width on mobile (`w-full`), capped to a sensible min-width on `sm`+ (`sm:w-auto sm:min-w-80` for the with-confirm-dialog variant, `sm:min-w-64` for the no-confirm variant).
- If any question is unanswered, clicking Submit opens an AlertDialog warning that unanswered questions count as wrong, with Cancel and Submit buttons.

---

## Storage map

What lives where:

| Concern | Backend | Key |
| ------- | ------- | --- |
| Lesson filters except search | URL query string | `levels`, `tags`, `favorites`, `status` |
| Sort | localStorage | `reading:sortBy` |
| Pin-content toggle | localStorage | `reading.lessonContentPinned` |
| Per-profile preferences (hint toggles, detail layout, content zoom, active profile) | IndexedDB `preferences` | row keyed by `profileId` |
| Lesson attempts | IndexedDB `attempts` | `[profileId+lessonId]` |
| In-progress draft | IndexedDB `drafts` | `[profileId+lessonId]` |
| Bookmarks | IndexedDB `bookmarks` | `[profileId+lessonId]` |
| Saved vocab | IndexedDB `vocab` | `[profileId+phraseLower]` (dedup) |
| Notes | IndexedDB `notes` | `[profileId+lessonId]` |
| Timer state | Zustand store (in-memory only) | one process-wide instance |
