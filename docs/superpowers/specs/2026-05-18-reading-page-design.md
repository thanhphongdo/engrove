# Reading page — design spec

**Date:** 2026-05-18
**Status:** Draft, awaiting user review
**Scope:** App shell (sidebar nav + theme + global providers) + the Reading page (hub + lesson detail). Writing / Listening / Grammar / Speaking get stub routes only.

## 1. Goals

- A learner picks a Reading lesson at their CEFR level, reads the passage, answers a multiple-choice quiz, and sees their score.
- The same shell hosts four more skills later (Writing, Listening, Grammar, Speaking) without rework — the shell, theming, and data layer must be skill-agnostic.
- Works fully offline. No login, no API key at runtime. All user data stays in the browser.

## 2. Out of scope

- The lesson generator script that authors the 250 JSON files (run out-of-band before deploy).
- Authentication, cloud sync, leaderboards, social features.
- Content for Writing / Listening / Grammar / Speaking — they get "Coming soon" stub pages only.

## 3. UX decisions (confirmed)

| Decision | Value |
|---|---|
| Lesson source | Pre-generated JSON, shipped with the app, 250 lessons (5 levels × 50). |
| Timer | Manual Start/Stop, multiple intervals sum into total duration. Submit auto-stops. |
| Hints | Settings popup with toggles: Vietnamese for hard words / grammar notes / full passage translation / per-question hint. Saved per profile. Off by default. |
| Quiz flow | All questions on one page. Submit at the end. Review mode replaces the quiz column with correctness + explanations after submit. |
| Profile model | Single profile UX today, but every DB row carries `profileId` so multi-profile / cloud sync can be added later without migration. |
| Retakes | Unlimited. Every attempt stored. Cards show best score. |
| Hub list | Multi-select level chips + multi-select tag chips. No forced level tabs. Every card shows its level badge. |
| Layout (lesson detail) | Two-column (passage + quiz) on viewports ≥ 64rem (~1024px), stacked below. User can override to stacked via a toggle in the header — preference saved per profile. |
| Submit with unanswered | Confirm dialog ("3 unanswered — submit anyway?"). On confirm, unanswered count as wrong. |
| Timer vs Submit | Independent. Submit auto-stops the timer. |
| Mid-lesson reload | Persist in-progress answers + accumulated time. On restore the timer is paused — user must click Start to resume. (Avoids crediting time spent with the tab closed.) |

## 4. Architecture

**Stack** (existing deps in [package.json](../../../package.json)):

- Next.js 16 (app router), React 19, TypeScript.
- Tailwind v4 + shadcn primitives.
- `@tanstack/react-query` for lesson loading + cache.
- `zustand` for ephemeral UI state (timer ticks, hint popover open/closed).
- `react-hook-form` + `zod` for the quiz form and lesson schema validation.
- `next-themes` for light/dark toggle.
- `sonner` for toasts (e.g. "Saved" on hint settings change).
- `lucide-react` for icons.

**New dependency:** `dexie` — only new package required.

**Lesson data:**
- Static JSON files at `public/lessons/reading/{a1,a2,b1,b2,c1}.json`.
- Loaded lazily via React Query (`useQuery({ queryKey: ["lessons", "reading", level], ... })`).
- Validated against a zod schema at load time. Malformed files fail loudly with a clear error toast in dev.

**User data (IndexedDB via Dexie):**

Database name: `english-learning`. Version 1.

```ts
// src/lib/db/schema.ts

profiles    PK: id          // { id, name, createdAt }
preferences PK: profileId   // { profileId, hintToggles, detailLayout, theme, activeProfileId }
                            // singleton row keyed by profileId; activeProfileId stored
                            // here too (so a single row read gives you "who am I + my prefs")
drafts      PK: [profileId+lessonId]
                            // in-progress lesson: answers map, accumulated durationMs,
                            // updatedAt. Created on first answer or first Start. Deleted on Submit.
attempts    PK: id (uuid)   // completed attempts
                            // indexes on [profileId+lessonId], completedAt
```

`profileId` is `"default"` until multi-profile lands. On first launch, the app inserts `{ id: "default", name: "Me" }` and a matching `preferences` row.

**Lesson schema (validated by zod):**

```ts
type Lesson = {
  id: string;                                     // "reading-a1-001"
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  title: string;
  summary: string;
  format: "paragraph" | "dialogue";
  body: string | DialogueTurn[];                  // depends on format
  tags: string[];
  annotations: Array<{
    phrase: string;                               // exact substring to underline
    meaningVi: string;
    pronunciation?: string;
    exampleEn?: string;
  }>;
  grammarNotes: Array<{ title: string; bodyVi: string; bodyEn: string }>;
  translationVi: string;                          // full passage Vietnamese translation
  questions: Array<{
    id: string;
    prompt: string;
    options: [string, string, string, string];   // always 4
    answerIndex: 0 | 1 | 2 | 3;
    explanation: string;                          // shown after submit
    hint: string;                                 // shown when 💡 clicked
  }>;
};

type DialogueTurn = { speaker: string; text: string };
```

**Attempt schema:**

```ts
type Attempt = {
  id: string;                                     // uuid
  profileId: string;
  lessonId: string;
  startedAt: number;                              // epoch ms, first Start click
  completedAt: number;                            // epoch ms, Submit click
  durationMs: number;                             // accumulated time across Start/Stop intervals
  score: number;                                  // count of correct answers
  total: number;                                  // total questions
  answers: Array<{
    questionId: string;
    pickedIndex: number | null;                   // null = unanswered
    correct: boolean;
  }>;
};
```

**Draft schema (in-progress):**

```ts
type Draft = {
  profileId: string;
  lessonId: string;
  answers: Record<string, number>;                // questionId → pickedIndex
  durationMs: number;                             // accumulated so far
  updatedAt: number;
};
```

Drafts are paused-by-default on restore: the page reads the draft, prefills answers + durationMs, but the timer starts in "stopped" state. User clicks Start to resume.

## 5. Routing & file structure

```
src/app/
  layout.tsx                  // root: fonts, ThemeProvider, QueryClientProvider, Dexie init
  page.tsx                    // redirect → /reading
  (app)/
    layout.tsx                // sidebar + main column
    reading/
      page.tsx                // hub
      [lessonId]/page.tsx     // detail
    writing/page.tsx          // "Coming soon"
    listening/page.tsx        // "Coming soon"
    grammar/page.tsx          // "Coming soon"
    speaking/page.tsx         // "Coming soon"

src/components/
  ui/                         // shadcn primitives (existing)
  app-shell/
    sidebar.tsx
    sidebar-item.tsx
    theme-toggle.tsx
  reading/
    lesson-card.tsx
    filter-chip-row.tsx       // generic: used for both level + tag rows
    passage.tsx
    passage-annotation.tsx    // tooltip popover for a hard word
    grammar-notes.tsx
    quiz.tsx
    quiz-question.tsx
    hint-settings-popover.tsx
    lesson-timer.tsx
    review-summary.tsx        // post-submit footer with score/time + Retry
    attempt-history.tsx       // sparkline + table on lesson detail

src/lib/
  db/
    client.ts                 // const db = new Dexie("english-learning"); db.version(1).stores({...})
    queries.ts                // typed wrappers: getActiveProfile, listAttempts, saveAttempt, upsertDraft, ...
    init.ts                   // first-launch seed of default profile + preferences
  lessons/
    schema.ts                 // zod schema
    types.ts                  // Lesson, DialogueTurn
    load.ts                   // useLessons(level) hook backed by react-query

src/stores/
  timer-store.ts              // zustand: per-lesson timer state (running flag, anchor, accumulated)
  quiz-store.ts               // zustand: in-progress answers; debounced sync to drafts table

src/data/
  tags.ts                     // optional: canonical tag list for filter UI
```

## 6. Page-level designs

### 6.1 App shell

- Persistent left sidebar (mockup: `.superpowers/brainstorm/.../app-shell.html`, option A).
- Items: Reading (active path: `/reading`), Writing, Listening, Grammar, Speaking. Each with a `lucide-react` icon. The four stubs show a small "Coming soon" pill next to the label.
- Footer of sidebar: theme toggle (light / dark / system) — via `next-themes`.
- On viewports < 48rem (~768px), sidebar collapses to icons-only; tapping the hamburger icon in the page header reveals labels in an overlay drawer.
- Active item highlighted using existing shadcn `bg-secondary` token — no new colors.

### 6.2 Reading hub (`/reading`)

(mockup: `.superpowers/brainstorm/.../reading-hub-v2.html`)

URL search params drive filter state and are the source of truth: `?levels=A1,A2&tags=Travel`. Bookmark-friendly, refresh-safe.

Layout:

- **Title row:** "Reading lessons" + counter "12 / 250 completed" (computed from `attempts` rows).
- **Level filter row:** five chips A1 / A2 / B1 / B2 / C1. Multi-select. None selected = all levels. Each level has a distinct color so the badge on a card is identifiable at a glance. The shadcn palette in [globals.css](../../../src/app/globals.css) only ships neutral tokens, so the implementation adds **five new level-color tokens** to `globals.css` (`--level-a1`, `--level-a2`, …, `--level-c1`) plus matching `--level-a1-foreground` pairs, then exposes them in `@theme inline` as `--color-level-a1` etc. The visual progression should read as a gentle "warmer/cooler with difficulty" gradient — concrete `oklch()` values are an implementation detail; aim for ≥ 4.5:1 contrast on the badge background.
- **Tag filter row:** chips for every tag present in the filtered lesson set. Multi-select. "Clear filters" link at the right side, visible only when filters are active.
- **Lesson grid:** responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`. Each card:
  - Header row: title (left, truncated to 2 lines) + level badge (right, color from above).
  - Body: summary, clamped to 2 lines.
  - Footer row: tag list (truncated with "+N" overflow) + status badge ("✓ Best 9/10" green or "Not started" muted).
  - Whole card is a `next/link` to `/reading/{lessonId}`.

Loading state: 6 skeleton cards. Empty state (after filtering): "No lessons match these filters." with a Clear button.

### 6.3 Lesson detail (`/reading/[lessonId]`)

(mockup: `.superpowers/brainstorm/.../lesson-detail.html`)

**Header bar** (sticky to top of main column):

- Back link to `/reading` (preserves the search params).
- Title, level badge, tags.
- "Best 9/10 · 3 attempts" line (computed from `attempts`).
- Right side: timer display (mm:ss), Start/Stop button (toggles label + icon based on state), Hints button (opens popover), Layout toggle (two-column / stacked).

**Summary card:** italic callout with the lesson `summary`.

**Body:**

- ≥ 64rem viewport, "two-column" preference: `grid-cols-[1.2fr_1fr] gap-6`. Passage left, quiz right. Both columns can scroll independently of the page, but page-level scroll is the primary mode — the columns grow with content.
- "Stacked" preference OR viewport < 64rem: passage above, quiz below. Single column.

**Passage component:**

- Renders the `body` field. For dialogue format, each turn is `<p><strong>{speaker}:</strong> {text}</p>`.
- When the "Vietnamese for hard words" toggle is ON, every occurrence of an `annotations[i].phrase` in the text is wrapped in `<PassageAnnotation>` — a Radix `Popover` trigger. Click → popover with `meaningVi`, optional `pronunciation`, optional `exampleEn`.
- Phrase matching is exact substring, longest-first to avoid partial matches. Each occurrence is wrapped (not just the first).
- When "Full passage translation" toggle is ON, a second sub-column inside the passage card shows `translationVi` aligned to the original. On stacked layout this becomes a stacked section below the passage.
- Grammar notes (`grammarNotes`) appear below the passage in a collapsible section when the "Grammar / tense notes" toggle is ON.

**Quiz component:**

- React Hook Form managing a `{ [questionId]: number }` map. Zod schema requires nothing (we allow partial submission).
- For each question: prompt, four `<RadioGroupItem>`. Optional 💡 Hint button (only when the "Per-question hint" toggle is ON) reveals a small text block below the prompt with `question.hint`.
- "3 / 10 answered" counter at the top of the column.
- Submit button at the bottom. If `answeredCount < total`, open AlertDialog: "{N} questions unanswered. Submit anyway?". On confirm:
  1. Stop timer.
  2. Compute score: count of `answers[qid] === question.answerIndex`. Unanswered → `pickedIndex: null`, `correct: false`.
  3. Insert `Attempt` row into IndexedDB.
  4. Delete the `Draft` row.
  5. Toast: "Saved. Score: 9/10".
  6. Switch quiz column into **review mode** — each question now shows correctness border (green / red), the correct option marked, the user's pick marked, and the `explanation` text below. Submit button replaced with "Retry" button.

**Retry:** clears form, resets timer to 00:00, creates a fresh `Draft` row on first answer.

**Lesson Timer (zustand store):**

- State: `{ running: boolean, anchor: number | null, accumulatedMs: number }`.
- `anchor` is the epoch-ms of the most recent Start when `running` is true; null when stopped.
- `display = accumulatedMs + (running ? now - anchor : 0)`. The component subscribes with a 1-second tick.
- Start: `running = true; anchor = Date.now()`.
- Stop: `running = false; accumulatedMs += now - anchor; anchor = null`.
- On Submit, force Stop first.
- Persistence: on Stop and on every accumulator update, the quiz store debounces a write to the `Draft` row (1s debounce).

**Mid-lesson recovery:**

- On lesson page mount, query `drafts` table for `[profileId, lessonId]`.
- If a draft exists: prefill the RHF form from `draft.answers`, set timer `accumulatedMs = draft.durationMs`, leave timer `running = false`.
- Show a non-blocking banner: "Resumed your in-progress attempt." with an "Abandon and start over" link that deletes the draft.

**Attempt history:**

- Below the quiz (or full-width after review), a small section: line sparkline of past attempt scores, plus a table (date, score, time-on-task). Hidden when there are no attempts.

### 6.4 Stub pages

`/writing`, `/listening`, `/grammar`, `/speaking` each render the shell layout with a centered card: "Coming soon". The sidebar item is active to confirm routing works.

## 7. Hint settings popover

- Anchored to the Hints button in the lesson detail header.
- Four checkboxes (controlled, value comes from `preferences.hintToggles`):
  - "Show Vietnamese for hard words"
  - "Show grammar / tense notes"
  - "Show full passage translation"
  - "Show per-question hint button"
- On any toggle, write to IndexedDB `preferences.hintToggles` and emit a toast "Saved".
- Defaults: all off.

## 8. Consistency contract

The four future skill pages will reuse:

- App shell (sidebar, theme, layout primitives).
- `attempts` table is skill-agnostic — `lessonId` namespaces by skill (`reading-a1-001`, `grammar-b1-014`, etc.) so they share the same query patterns.
- Filter chip row component is generic — reused for any "pick level / pick tag" filter UI.
- Lesson card + status badge pattern is reusable for any future "browse a list of lessons" UI.

## 9. Risks & open notes

- **Multiple tabs on the same lesson** will race on the draft row. Last-write-wins is acceptable for v1 — document the edge case rather than build cross-tab coordination.
- **Annotation phrase matching is naive** (exact substring, case-sensitive, longest-first). Edge cases — punctuation, plurals, contractions — are deliberately the responsibility of the generator script (it should emit exact phrases as they appear in the text). The runtime doesn't try to be clever.
- **No `dialogue` rendering in the mockups** — the format is allowed in the data model but rarely featured. Generator should default to paragraph for v1; dialogues are a nice-to-have we won't block on.
- **The 250 lesson JSONs are not part of this spec.** The runtime must work with a single hand-authored sample lesson per level (5 lessons total) so we can build and verify the UI before content lands.

## 10. Acceptance criteria

A reviewer can verify the build by:

1. Visiting `/` and being redirected to `/reading`. Sidebar shows 5 items; only Reading is real.
2. Toggling the dark mode in the sidebar footer flips the theme.
3. `/reading` shows the 5 sample lessons. Selecting A1 + a tag filters the grid. The "Clear filters" link clears them.
4. Opening a lesson:
   - Header shows level, tags, timer (00:00), Start/Stop, Hints, layout toggle.
   - Passage and quiz render side-by-side at ≥ 64rem, stacked below.
   - Hints popover toggles cause the passage to acquire / lose underlined hard words, the translation block, the grammar notes section, and the quiz cards to gain / lose the 💡 button.
   - Start runs the timer; Stop pauses it; resuming preserves accumulated time.
   - Picking answers updates the "X / N answered" counter. Submitting with unanswered shows the confirm dialog.
   - Submitting saves an `Attempt` row (verifiable in DevTools → Application → IndexedDB → `english-learning` → `attempts`), shows the score toast, and reveals the review mode with correct/incorrect indicators and per-question explanations.
   - Reloading mid-lesson restores the answers and accumulated time but leaves the timer paused.
5. After completing the lesson, returning to `/reading` shows the card with the "Best 9/10" badge.
6. Visiting `/writing`, `/listening`, `/grammar`, `/speaking` shows the "Coming soon" placeholder inside the shell.
