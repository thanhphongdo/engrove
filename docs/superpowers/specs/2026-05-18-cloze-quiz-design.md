# Cloze quiz — design spec

**Date:** 2026-05-18
**Status:** Approved, in implementation
**Scope:** Adds a second quiz type (cloze / fill-in-the-blank) to each Reading lesson on top of the existing multiple-choice quiz.

## 1. Goals

After finishing the passage, the learner answers a paragraph-shaped cloze quiz: a short text with multiple inline `<select>` blanks, 4 options each (single words or short phrases). Words and phrases are chosen by the lesson author and can target either vocabulary or grammar depending on difficulty.

## 2. Out of scope

- Free-typed fill-in-the-blank (no text input — every blank is a `<select>` with 4 options).
- Cloze quiz on its own page or its own route (it's a section on the existing lesson detail page).
- Generator script for cloze content (authoring is out-of-band, like MC content).
- Other skill pages (Writing / Listening / Grammar / Speaking) — though the `Attempt` schema's `mcScore` / `clozeScore` shape is intentionally skill-agnostic.

## 3. Confirmed UX decisions

| Decision | Value |
|---|---|
| Relation to MC quiz | Both run on the same lesson, sequential on the page. **One** Submit button at the bottom covers both. **One** `Attempt` row stores combined + per-quiz scores. |
| Cloze shape | One short paragraph with multiple inline blanks, NOT one-sentence-per-blank. 5–10 blanks per lesson. |
| Required? | Optional per lesson. Lessons without a `cloze` field render exactly as today (MC only). |
| Submit gate | Unanswered confirm dialog counts MC + cloze blanks combined. |
| Review mode | MC review unchanged. Cloze blanks gain a green/red ring on the `<select>`, plus an explanation list below the paragraph. |
| Retake | Same as MC — `retry()` clears both picks, resets timer, deletes draft. |
| Best score | Combined MC + cloze. The hub card shows `Best 14/15` (sum) regardless of which quizzes the lesson has. |

## 4. Lesson schema addition

```ts
type ClozeBlank = {
  id: string;                                 // unique within the lesson, e.g. "b1"
  options: [string, string, string, string];  // words OR short phrases
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
};

type ClozeQuiz = {
  // Paragraph with {{blank-id}} placeholders, e.g.
  // "Yesterday I {{b1}} to Paris. The {{b2}} was very busy."
  template: string;
  blanks: ClozeBlank[];                       // length matches placeholder count
};

type Lesson = {
  // ...existing fields...
  cloze?: ClozeQuiz;                          // OPTIONAL
};
```

**Validation (zod):**

- Every blank ID appears in the template as `{{id}}` exactly once.
- Every `{{...}}` in the template has a matching blank.
- Each blank has exactly 4 options.
- `answerIndex` is 0–3.

Validation runs at lesson load (the existing `lessonsFileSchema` pipeline). Malformed cloze data fails loudly in dev.

## 5. Attempt schema addition

```ts
type Attempt = {
  // ...existing fields...
  score: number;                  // combined (mcScore + clozeScore)
  total: number;                  // combined
  mcScore: number;
  mcTotal: number;
  clozeScore: number;             // 0 when no cloze
  clozeTotal: number;             // 0 when no cloze
  answers: AnswerRow[];           // MC answers (unchanged from today)
  clozeAnswers?: AnswerRow[];     // present only when the lesson had a cloze
};
```

**Dexie v3 migration:** backfill v2 rows with `mcScore = score`, `mcTotal = total`, `clozeScore = 0`, `clozeTotal = 0`. Existing attempts become "MC-only" attempts.

## 6. Draft schema addition

```ts
type Draft = {
  // ...existing fields...
  answers: Record<string, number>;        // MC picks (unchanged)
  clozePicks: Record<string, number>;     // NEW — keyed by blank.id
};
```

The 1-second debounced auto-save persists both maps. On resume, both prefill. Dexie v3 backfills missing `clozePicks` to `{}`.

## 7. UI changes

### Page layout

Today: `<Passage | MCQuiz>` at ≥ 64rem (two columns), `<Passage above MCQuiz>` below.

After:

```
[Header bar (timer / hints / layout toggle)]
[Summary callout]
[Resume banner — if draft restored]

  ─────────── two columns (layout-toggle still applies) ──────────
  │ Passage              │ MC questions (cards)                  │
  ────────────────────────────────────────────────────────────────

  ─────────── full-width, only when lesson.cloze exists ──────────
  │ Cloze paragraph with inline <select>s                         │
  ────────────────────────────────────────────────────────────────

  [Submit button — single button, covers BOTH quizzes]

[ReviewSummary — appears after submit]
[AttemptHistory]
```

The Submit button moves out of the MC quiz column and lives at the bottom of the lesson body, full-width.

### Counter line

Today's "3 / 10 answered" header inside the MC card becomes a footer line above the Submit button:
- No cloze: `3 / 10 answered`
- With cloze: `7 / 15 answered (MC 3/10 · Cloze 4/5)`

### Review mode

- MC question cards: unchanged (green/red border + explanation).
- Cloze paragraph: each `<select>` gains a `ring-green-500/50` or `ring-red-500/50`. The chosen option label is also annotated next to the select after submit, since the closed select doesn't show the picked value when disabled.
- Below the cloze paragraph: a list of `b1`, `b2`, … with the correct option and the explanation, in order.

### Submit AlertDialog

Unanswered count = `mcQuestions.length - mcPicks.size + clozeBlanks.length - clozePicks.size`. Dialog text reads "{N} questions unanswered" (no distinction between MC vs cloze — keep it simple).

## 8. Components

- `src/components/reading/quiz.tsx` — renamed responsibility. **Becomes `QuizSection`**: owns both `mcPicks` and `clozePicks`, the Submit flow, draft auto-save, retry. Renders `<MCQuestions>` + `<ClozeBlock>` + Submit. Existing import sites (the lesson detail page) keep importing `Quiz` — we keep the export name `Quiz` for compatibility.
- `src/components/reading/mc-questions.tsx` — **new**, extracted from current Quiz. Renders the MC question-card list. Pure presentation; takes `picks` + `onPick` + `reviewMode` + `showHint`.
- `src/components/reading/cloze-block.tsx` — **new**. Renders the template with inline `<select>` elements (shadcn `Select` if available, else native `<select>` styled to match). Takes `cloze` + `picks` + `onPick` + `reviewMode`. Uses a parser helper to split the template into text/blank segments.
- `src/components/reading/cloze-review.tsx` — **new**. Per-blank explanation list, shown only in review mode.
- `src/components/reading/review-summary.tsx` — extended. When `clozeTotal > 0`, shows three lines: MC X/Y, Cloze X/Y, Total X/Y. Otherwise unchanged.
- `src/lib/lessons/cloze-template.ts` — **new**, pure. `parseTemplate(template, blanks): Array<{kind:"text",text} | {kind:"blank",blank}>`. Validates placeholder/blank consistency.
- `src/lib/lessons/score.ts` — adds `scoreCloze(blanks, picks): ScoreResult` mirroring `scoreQuiz`. The combined math (MC + cloze) lives in `QuizSection`, not here.

## 9. shadcn `Select` primitive

Not in the project today. Will be added via `npx shadcn@latest add select` in the first task.

## 10. Sample data

`public/lessons/reading/a1.json` gets a `cloze` field added so the UI is testable end-to-end. Pulled from the existing passage. The other four level files stay MC-only.

Example:
```json
"cloze": {
  "template": "Yesterday I {{b1}} in Paris. The airport was {{b2}}. I took a {{b3}} to my hotel near the {{b4}}. At night, the lights on the bridges were {{b5}}.",
  "blanks": [
    { "id": "b1", "options": ["arrived", "arrive", "arriving", "arrives"], "answerIndex": 0, "explanation": "Past simple for a completed action." },
    { "id": "b2", "options": ["quiet", "very busy", "empty", "small"], "answerIndex": 1, "explanation": "From the passage: 'The airport was very busy.'" },
    { "id": "b3", "options": ["bus", "taxi", "train", "boat"], "answerIndex": 1, "explanation": "From the passage: 'I took a taxi.'" },
    { "id": "b4", "options": ["mountain", "park", "sea", "river"], "answerIndex": 3, "explanation": "From the passage: 'near the river.'" },
    { "id": "b5", "options": ["dark", "beautiful", "broken", "small"], "answerIndex": 1, "explanation": "From the passage: 'The lights on the bridges were beautiful.'" }
  ]
}
```

## 11. Risks / non-goals

- **Existing v2 attempts become "MC-only"** after migration. Acceptable — the migration is one-way and the v2 attempts genuinely had no cloze data.
- **Multi-tab cloze drafts** race the same way MC drafts do — last-write-wins, unchanged.
- **The cloze paragraph is intentionally separate from the lesson `body`**. We do NOT try to derive the cloze paragraph from the passage with auto-blanking. The author writes both. (We rejected option C from brainstorming.)

## 12. Acceptance criteria

1. A1 lesson loads — passage + MC at top, cloze paragraph with 5 selects below, single Submit at the bottom.
2. Lessons without a `cloze` field render exactly as today.
3. Counter line shows `X / 15 answered (MC X/10 · Cloze X/5)` when cloze exists; `X / 10 answered` otherwise.
4. Submit with unanswered — confirm dialog with the combined count.
5. After submit:
   - MC questions: green/red borders + explanations (as today).
   - Cloze selects: green/red ring, picked label annotated next to disabled select.
   - ReviewSummary shows MC + Cloze + Total lines.
   - Attempt history shows the combined score; opening the attempt in IndexedDB shows `mcScore` / `clozeScore` separately.
6. Reload mid-attempt restores both MC picks AND cloze picks; timer hydrated; banner shows.
7. Best-score badge on the lesson card reflects combined score.
8. All prior tests still green; new tests cover zod cloze validation, `parseTemplate`, `scoreCloze`.
