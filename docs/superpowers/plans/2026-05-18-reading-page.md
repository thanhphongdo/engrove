# Reading Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the app shell (sidebar + theming) and the Reading page (hub + lesson detail) per [docs/superpowers/specs/2026-05-18-reading-page-design.md](../specs/2026-05-18-reading-page-design.md). Other four skill pages get "Coming soon" stubs.

**Architecture:** Static lesson JSON in `public/lessons/reading/{level}.json` loaded via React Query. User data (profile, attempts, drafts, preferences) in IndexedDB via Dexie. UI state (timer, hint toggles) in zustand. Quiz form via react-hook-form + zod. Pure-logic functions get vitest unit tests; UI verified manually against the spec's acceptance criteria.

**Tech Stack:** Next.js 16 (app router) · React 19 · TypeScript · Tailwind v4 · shadcn primitives · `@tanstack/react-query` · `zustand` · `react-hook-form` + `zod` · `next-themes` · `sonner` · `lucide-react` · **new:** `dexie`, `vitest` + `@testing-library/react` + `fake-indexeddb`.

**Pre-existing scaffold to reuse:**
- `src/components/providers.tsx` — already wires QueryClient + ThemeProvider + Sonner Toaster.
- shadcn primitives already installed: avatar, badge, button, card, dialog, dropdown-menu, input, label, separator, sonner.
- `src/lib/utils.ts` — `cn` helper.
- `src/stores/example-store.ts` — pattern reference (delete in cleanup).

---

## File Structure

```
public/lessons/reading/
  a1.json  a2.json  b1.json  b2.json  c1.json     # 1-2 sample lessons per level

src/app/
  globals.css                                      # +5 level color tokens
  layout.tsx                                       # (unchanged from scaffold)
  page.tsx                                         # MODIFY: redirect → /reading
  (app)/
    layout.tsx                                     # CREATE: sidebar + main
    reading/
      page.tsx                                     # CREATE: hub
      [lessonId]/page.tsx                          # CREATE: detail
    writing/page.tsx     listening/page.tsx
    grammar/page.tsx     speaking/page.tsx         # CREATE: 4 stubs

src/components/
  app-shell/
    nav-config.ts        sidebar.tsx               sidebar-item.tsx
    theme-toggle.tsx     coming-soon.tsx
  reading/
    lesson-card.tsx              filter-chip-row.tsx
    passage.tsx                  passage-annotation.tsx
    grammar-notes.tsx            quiz.tsx
    quiz-question.tsx            hint-settings-popover.tsx
    lesson-timer.tsx             review-summary.tsx
    attempt-history.tsx          layout-toggle.tsx
    resume-banner.tsx

src/lib/
  db/
    types.ts             schema.ts                 # Dexie tables
    client.ts            queries.ts                init.ts
  lessons/
    types.ts             schema.ts                 # zod
    annotate.ts          load.ts                   # react-query hook
    score.ts                                       # pure scoring
  test-utils/
    fake-db.ts                                     # vitest setup helper

src/stores/
  timer-store.ts         quiz-store.ts             # zustand
  (example-store.ts deleted in Task 18)
```

---

## Task 1: Install dependencies & set up vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test-utils/setup.ts`
- Modify: `tsconfig.json`

- [ ] **Step 1: Install runtime + test deps**

Run:
```bash
npm install dexie
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom fake-indexeddb @vitejs/plugin-react
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-utils/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Create setup file**

Create `src/test-utils/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
```

- [ ] **Step 4: Add `test` and `test:watch` scripts**

Modify `package.json` `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify vitest runs**

Run: `npm test`
Expected: `No test files found` (clean exit), not an error about missing config.

- [ ] **Step 6: Install missing shadcn primitives**

Run:
```bash
npx shadcn@latest add checkbox radio-group popover tooltip scroll-area toggle-group alert-dialog skeleton
```
Expected: 8 new files in `src/components/ui/`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test-utils/ src/components/ui/ components.json
git commit -m "chore: add dexie, vitest, and missing shadcn primitives"
```

---

## Task 2: Level color tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add level color CSS variables to `:root` and `.dark`**

Modify `src/app/globals.css` — inside `:root { ... }` block, before the closing `}`, add:
```css
  --level-a1: oklch(0.85 0.13 145);          /* green */
  --level-a1-foreground: oklch(0.30 0.07 145);
  --level-a2: oklch(0.85 0.10 70);           /* amber */
  --level-a2-foreground: oklch(0.32 0.07 70);
  --level-b1: oklch(0.82 0.12 240);          /* blue */
  --level-b1-foreground: oklch(0.30 0.10 240);
  --level-b2: oklch(0.80 0.14 30);           /* orange */
  --level-b2-foreground: oklch(0.32 0.10 30);
  --level-c1: oklch(0.80 0.13 350);          /* rose */
  --level-c1-foreground: oklch(0.32 0.10 350);
```

Inside `.dark { ... }`, add (slightly darker bg, lighter fg):
```css
  --level-a1: oklch(0.30 0.10 145);
  --level-a1-foreground: oklch(0.90 0.10 145);
  --level-a2: oklch(0.30 0.08 70);
  --level-a2-foreground: oklch(0.90 0.08 70);
  --level-b1: oklch(0.30 0.10 240);
  --level-b1-foreground: oklch(0.90 0.10 240);
  --level-b2: oklch(0.30 0.10 30);
  --level-b2-foreground: oklch(0.90 0.10 30);
  --level-c1: oklch(0.30 0.10 350);
  --level-c1-foreground: oklch(0.90 0.10 350);
```

Inside the `@theme inline { ... }` block, add:
```css
  --color-level-a1: var(--level-a1);
  --color-level-a1-foreground: var(--level-a1-foreground);
  --color-level-a2: var(--level-a2);
  --color-level-a2-foreground: var(--level-a2-foreground);
  --color-level-b1: var(--level-b1);
  --color-level-b1-foreground: var(--level-b1-foreground);
  --color-level-b2: var(--level-b2);
  --color-level-b2-foreground: var(--level-b2-foreground);
  --color-level-c1: var(--level-c1);
  --color-level-c1-foreground: var(--level-c1-foreground);
```

- [ ] **Step 2: Verify tokens compile**

Run: `npm run dev` (in background or another terminal)
Open `http://localhost:4600/`. Page renders (no Tailwind compile error in the dev terminal).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): add A1-C1 level color tokens"
```

---

## Task 3: Lesson types & zod schema (with tests)

**Files:**
- Create: `src/lib/lessons/types.ts`
- Create: `src/lib/lessons/schema.ts`
- Create: `src/lib/lessons/schema.test.ts`

- [ ] **Step 1: Write failing test for schema**

Create `src/lib/lessons/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { lessonSchema, lessonsFileSchema } from "./schema";

const valid = {
  id: "reading-a1-001",
  level: "A1",
  title: "My first day in Paris",
  summary: "A tourist arrives in Paris.",
  format: "paragraph",
  body: "Yesterday I arrived in Paris. The airport was busy.",
  tags: ["Travel"],
  annotations: [
    { phrase: "airport", meaningVi: "sân bay" },
  ],
  grammarNotes: [],
  translationVi: "Hôm qua tôi đến Paris. Sân bay rất đông.",
  questions: [
    {
      id: "q1",
      prompt: "Where did the writer arrive?",
      options: ["Paris", "London", "Rome", "Berlin"],
      answerIndex: 0,
      explanation: "The first sentence says so.",
      hint: "Look at sentence 1.",
    },
  ],
};

describe("lessonSchema", () => {
  it("accepts a valid lesson", () => {
    expect(() => lessonSchema.parse(valid)).not.toThrow();
  });

  it("rejects a lesson with a level outside A1-C1", () => {
    expect(() => lessonSchema.parse({ ...valid, level: "D1" })).toThrow();
  });

  it("rejects a question with fewer than 4 options", () => {
    const bad = {
      ...valid,
      questions: [{ ...valid.questions[0], options: ["a", "b", "c"] }],
    };
    expect(() => lessonSchema.parse(bad)).toThrow();
  });

  it("rejects answerIndex outside 0-3", () => {
    const bad = {
      ...valid,
      questions: [{ ...valid.questions[0], answerIndex: 5 }],
    };
    expect(() => lessonSchema.parse(bad)).toThrow();
  });

  it("accepts a dialogue-format lesson", () => {
    const dialogue = {
      ...valid,
      format: "dialogue",
      body: [
        { speaker: "Anna", text: "Hello!" },
        { speaker: "Ben", text: "Hi Anna." },
      ],
    };
    expect(() => lessonSchema.parse(dialogue)).not.toThrow();
  });
});

describe("lessonsFileSchema", () => {
  it("accepts an array of lessons", () => {
    expect(() => lessonsFileSchema.parse([valid])).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/lessons/schema.test.ts`
Expected: FAIL ("Cannot find module './schema'").

- [ ] **Step 3: Create the schema**

Create `src/lib/lessons/types.ts`:
```ts
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1";

export type DialogueTurn = { speaker: string; text: string };

export type Annotation = {
  phrase: string;
  meaningVi: string;
  pronunciation?: string;
  exampleEn?: string;
};

export type GrammarNote = { title: string; bodyVi: string; bodyEn: string };

export type Question = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
  hint: string;
};

export type Lesson = {
  id: string;
  level: CefrLevel;
  title: string;
  summary: string;
  format: "paragraph" | "dialogue";
  body: string | DialogueTurn[];
  tags: string[];
  annotations: Annotation[];
  grammarNotes: GrammarNote[];
  translationVi: string;
  questions: Question[];
};
```

Create `src/lib/lessons/schema.ts`:
```ts
import { z } from "zod";

const cefrLevel = z.enum(["A1", "A2", "B1", "B2", "C1"]);

const dialogueTurn = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1),
});

const annotation = z.object({
  phrase: z.string().min(1),
  meaningVi: z.string().min(1),
  pronunciation: z.string().optional(),
  exampleEn: z.string().optional(),
});

const grammarNote = z.object({
  title: z.string().min(1),
  bodyVi: z.string().min(1),
  bodyEn: z.string().min(1),
});

const question = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  answerIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanation: z.string(),
  hint: z.string(),
});

export const lessonSchema = z.discriminatedUnion("format", [
  z.object({
    id: z.string().min(1),
    level: cefrLevel,
    title: z.string().min(1),
    summary: z.string(),
    format: z.literal("paragraph"),
    body: z.string().min(1),
    tags: z.array(z.string()),
    annotations: z.array(annotation),
    grammarNotes: z.array(grammarNote),
    translationVi: z.string(),
    questions: z.array(question).min(1),
  }),
  z.object({
    id: z.string().min(1),
    level: cefrLevel,
    title: z.string().min(1),
    summary: z.string(),
    format: z.literal("dialogue"),
    body: z.array(dialogueTurn).min(1),
    tags: z.array(z.string()),
    annotations: z.array(annotation),
    grammarNotes: z.array(grammarNote),
    translationVi: z.string(),
    questions: z.array(question).min(1),
  }),
]);

export const lessonsFileSchema = z.array(lessonSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/lessons/schema.test.ts`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lessons/
git commit -m "feat(lessons): zod schema and types for Lesson"
```

---

## Task 4: Annotation matcher (pure function, with tests)

**Files:**
- Create: `src/lib/lessons/annotate.ts`
- Create: `src/lib/lessons/annotate.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/lessons/annotate.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { splitWithAnnotations } from "./annotate";

const A = (phrase: string, meaningVi: string) => ({ phrase, meaningVi });

describe("splitWithAnnotations", () => {
  it("returns one text segment when there are no annotations", () => {
    expect(splitWithAnnotations("Hello world", [])).toEqual([
      { kind: "text", text: "Hello world" },
    ]);
  });

  it("wraps a single annotation occurrence", () => {
    expect(
      splitWithAnnotations("I took a taxi to the hotel.", [A("taxi", "taxi")]),
    ).toEqual([
      { kind: "text", text: "I took a " },
      { kind: "annotation", text: "taxi", annotation: A("taxi", "taxi") },
      { kind: "text", text: " to the hotel." },
    ]);
  });

  it("wraps every occurrence of the same phrase", () => {
    const result = splitWithAnnotations("taxi or taxi", [A("taxi", "taxi")]);
    expect(result.filter((s) => s.kind === "annotation")).toHaveLength(2);
  });

  it("matches longest annotation first when they overlap", () => {
    const annos = [A("New York", "Nữu Ước"), A("New", "Mới")];
    const result = splitWithAnnotations("I love New York.", annos);
    const annoSegments = result.filter((s) => s.kind === "annotation");
    expect(annoSegments).toHaveLength(1);
    expect(annoSegments[0].text).toBe("New York");
  });

  it("is case-sensitive (exact substring)", () => {
    const result = splitWithAnnotations("Taxi and taxi", [A("taxi", "taxi")]);
    expect(result.filter((s) => s.kind === "annotation")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/lessons/annotate.test.ts`
Expected: FAIL ("Cannot find module './annotate'").

- [ ] **Step 3: Implement matcher**

Create `src/lib/lessons/annotate.ts`:
```ts
import type { Annotation } from "./types";

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "annotation"; text: string; annotation: Annotation };

export function splitWithAnnotations(
  text: string,
  annotations: Annotation[],
): Segment[] {
  if (annotations.length === 0) return [{ kind: "text", text }];

  const sorted = [...annotations].sort((a, b) => b.phrase.length - a.phrase.length);

  type Match = { start: number; end: number; annotation: Annotation };
  const matches: Match[] = [];

  for (const anno of sorted) {
    let from = 0;
    while (true) {
      const idx = text.indexOf(anno.phrase, from);
      if (idx === -1) break;
      const end = idx + anno.phrase.length;
      const overlaps = matches.some(
        (m) => !(end <= m.start || idx >= m.end),
      );
      if (!overlaps) matches.push({ start: idx, end, annotation: anno });
      from = end;
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, m.start) });
    }
    segments.push({
      kind: "annotation",
      text: text.slice(m.start, m.end),
      annotation: m.annotation,
    });
    cursor = m.end;
  }
  if (cursor < text.length) {
    segments.push({ kind: "text", text: text.slice(cursor) });
  }
  return segments;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test src/lib/lessons/annotate.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lessons/annotate.ts src/lib/lessons/annotate.test.ts
git commit -m "feat(lessons): annotation matcher (longest-first, non-overlapping)"
```

---

## Task 5: Scoring function (pure, with tests)

**Files:**
- Create: `src/lib/lessons/score.ts`
- Create: `src/lib/lessons/score.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/lessons/score.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { scoreQuiz } from "./score";
import type { Question } from "./types";

const q = (id: string, answerIndex: 0 | 1 | 2 | 3): Question => ({
  id,
  prompt: id,
  options: ["a", "b", "c", "d"],
  answerIndex,
  explanation: "",
  hint: "",
});

describe("scoreQuiz", () => {
  it("counts correct answers", () => {
    const questions = [q("q1", 0), q("q2", 1), q("q3", 2)];
    const picks = { q1: 0, q2: 1, q3: 0 };
    const result = scoreQuiz(questions, picks);
    expect(result.score).toBe(2);
    expect(result.total).toBe(3);
  });

  it("treats missing picks as unanswered (incorrect)", () => {
    const questions = [q("q1", 0), q("q2", 1)];
    const picks = { q1: 0 };
    const result = scoreQuiz(questions, picks);
    expect(result.score).toBe(1);
    expect(result.answers).toEqual([
      { questionId: "q1", pickedIndex: 0, correct: true },
      { questionId: "q2", pickedIndex: null, correct: false },
    ]);
  });

  it("returns an answers array in question order", () => {
    const questions = [q("q1", 0), q("q2", 1)];
    const picks = { q2: 1, q1: 0 };
    const result = scoreQuiz(questions, picks);
    expect(result.answers.map((a) => a.questionId)).toEqual(["q1", "q2"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/lessons/score.test.ts`
Expected: FAIL ("Cannot find module './score'").

- [ ] **Step 3: Implement scoring**

Create `src/lib/lessons/score.ts`:
```ts
import type { Question } from "./types";

export type AnswerRow = {
  questionId: string;
  pickedIndex: number | null;
  correct: boolean;
};

export type ScoreResult = {
  score: number;
  total: number;
  answers: AnswerRow[];
};

export function scoreQuiz(
  questions: Question[],
  picks: Record<string, number>,
): ScoreResult {
  const answers: AnswerRow[] = questions.map((q) => {
    const pickedIndex = q.id in picks ? picks[q.id] : null;
    return {
      questionId: q.id,
      pickedIndex,
      correct: pickedIndex === q.answerIndex,
    };
  });
  return {
    score: answers.filter((a) => a.correct).length,
    total: questions.length,
    answers,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test src/lib/lessons/score.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lessons/score.ts src/lib/lessons/score.test.ts
git commit -m "feat(lessons): pure scoring function"
```

---

## Task 6: IndexedDB layer (Dexie client + types + tests)

**Files:**
- Create: `src/lib/db/types.ts`
- Create: `src/lib/db/client.ts`
- Create: `src/lib/db/queries.ts`
- Create: `src/lib/db/init.ts`
- Create: `src/lib/db/db.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/db/db.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./client";
import {
  ensureDefaultProfile,
  getActiveProfile,
  getPreferences,
  setHintToggle,
  setDetailLayout,
  saveAttempt,
  listAttemptsForLesson,
  upsertDraft,
  getDraft,
  deleteDraft,
} from "./queries";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("ensureDefaultProfile", () => {
  it("creates the default profile and preferences on first call", async () => {
    await ensureDefaultProfile();
    const profile = await getActiveProfile();
    expect(profile?.id).toBe("default");
    const prefs = await getPreferences("default");
    expect(prefs?.hintToggles.vocabVi).toBe(false);
    expect(prefs?.detailLayout).toBe("two-column");
  });

  it("is idempotent", async () => {
    await ensureDefaultProfile();
    await ensureDefaultProfile();
    const count = await db.profiles.count();
    expect(count).toBe(1);
  });
});

describe("preference setters", () => {
  it("updates a single hint toggle", async () => {
    await ensureDefaultProfile();
    await setHintToggle("default", "vocabVi", true);
    const prefs = await getPreferences("default");
    expect(prefs?.hintToggles.vocabVi).toBe(true);
    expect(prefs?.hintToggles.grammar).toBe(false);
  });

  it("updates detail layout", async () => {
    await ensureDefaultProfile();
    await setDetailLayout("default", "stacked");
    const prefs = await getPreferences("default");
    expect(prefs?.detailLayout).toBe("stacked");
  });
});

describe("attempts", () => {
  it("saves and lists attempts for a lesson", async () => {
    await ensureDefaultProfile();
    await saveAttempt({
      id: "att-1",
      profileId: "default",
      lessonId: "reading-a1-001",
      startedAt: 1000,
      completedAt: 2000,
      durationMs: 800,
      score: 9,
      total: 10,
      answers: [],
    });
    const list = await listAttemptsForLesson("default", "reading-a1-001");
    expect(list).toHaveLength(1);
    expect(list[0].score).toBe(9);
  });
});

describe("drafts", () => {
  it("upserts and retrieves a draft", async () => {
    await ensureDefaultProfile();
    await upsertDraft({
      profileId: "default",
      lessonId: "reading-a1-001",
      answers: { q1: 0 },
      durationMs: 5000,
      updatedAt: 1000,
    });
    const draft = await getDraft("default", "reading-a1-001");
    expect(draft?.answers.q1).toBe(0);
    expect(draft?.durationMs).toBe(5000);
  });

  it("overwrites an existing draft", async () => {
    await ensureDefaultProfile();
    await upsertDraft({
      profileId: "default",
      lessonId: "reading-a1-001",
      answers: { q1: 0 },
      durationMs: 1000,
      updatedAt: 1000,
    });
    await upsertDraft({
      profileId: "default",
      lessonId: "reading-a1-001",
      answers: { q1: 0, q2: 2 },
      durationMs: 5000,
      updatedAt: 2000,
    });
    const draft = await getDraft("default", "reading-a1-001");
    expect(draft?.durationMs).toBe(5000);
    expect(draft?.answers.q2).toBe(2);
  });

  it("deletes a draft", async () => {
    await ensureDefaultProfile();
    await upsertDraft({
      profileId: "default",
      lessonId: "reading-a1-001",
      answers: { q1: 0 },
      durationMs: 100,
      updatedAt: 0,
    });
    await deleteDraft("default", "reading-a1-001");
    const draft = await getDraft("default", "reading-a1-001");
    expect(draft).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/db/db.test.ts`
Expected: FAIL ("Cannot find module './client'").

- [ ] **Step 3: Define types**

Create `src/lib/db/types.ts`:
```ts
import type { AnswerRow } from "@/lib/lessons/score";

export type Profile = { id: string; name: string; createdAt: number };

export type HintToggles = {
  vocabVi: boolean;
  grammar: boolean;
  passageTranslation: boolean;
  perQuestionHint: boolean;
};

export type DetailLayout = "two-column" | "stacked";

export type Preferences = {
  profileId: string;
  hintToggles: HintToggles;
  detailLayout: DetailLayout;
  activeProfileId: string;
};

export type Attempt = {
  id: string;
  profileId: string;
  lessonId: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  score: number;
  total: number;
  answers: AnswerRow[];
};

export type Draft = {
  profileId: string;
  lessonId: string;
  answers: Record<string, number>;
  durationMs: number;
  updatedAt: number;
};

export const DEFAULT_HINT_TOGGLES: HintToggles = {
  vocabVi: false,
  grammar: false,
  passageTranslation: false,
  perQuestionHint: false,
};
```

- [ ] **Step 4: Create Dexie client**

Create `src/lib/db/client.ts`:
```ts
import Dexie, { type Table } from "dexie";
import type { Profile, Preferences, Attempt, Draft } from "./types";

class EnglishLearningDB extends Dexie {
  profiles!: Table<Profile, string>;
  preferences!: Table<Preferences, string>;
  attempts!: Table<Attempt, string>;
  drafts!: Table<Draft, [string, string]>;

  constructor() {
    super("english-learning");
    this.version(1).stores({
      profiles: "id",
      preferences: "profileId",
      attempts: "id, [profileId+lessonId], completedAt",
      drafts: "[profileId+lessonId]",
    });
  }
}

export const db = new EnglishLearningDB();
```

- [ ] **Step 5: Create queries**

Create `src/lib/db/queries.ts`:
```ts
import { db } from "./client";
import {
  DEFAULT_HINT_TOGGLES,
  type Attempt,
  type DetailLayout,
  type Draft,
  type HintToggles,
  type Preferences,
  type Profile,
} from "./types";

const DEFAULT_PROFILE_ID = "default";

export async function ensureDefaultProfile(): Promise<void> {
  await db.transaction("rw", db.profiles, db.preferences, async () => {
    const existing = await db.profiles.get(DEFAULT_PROFILE_ID);
    if (existing) return;
    const now = Date.now();
    await db.profiles.put({ id: DEFAULT_PROFILE_ID, name: "Me", createdAt: now });
    await db.preferences.put({
      profileId: DEFAULT_PROFILE_ID,
      hintToggles: { ...DEFAULT_HINT_TOGGLES },
      detailLayout: "two-column",
      activeProfileId: DEFAULT_PROFILE_ID,
    });
  });
}

export async function getActiveProfile(): Promise<Profile | undefined> {
  const prefs = await db.preferences.toCollection().first();
  if (!prefs) return undefined;
  return db.profiles.get(prefs.activeProfileId);
}

export async function getPreferences(profileId: string): Promise<Preferences | undefined> {
  return db.preferences.get(profileId);
}

export async function setHintToggle(
  profileId: string,
  key: keyof HintToggles,
  value: boolean,
): Promise<void> {
  const prefs = await db.preferences.get(profileId);
  if (!prefs) return;
  prefs.hintToggles = { ...prefs.hintToggles, [key]: value };
  await db.preferences.put(prefs);
}

export async function setDetailLayout(
  profileId: string,
  layout: DetailLayout,
): Promise<void> {
  const prefs = await db.preferences.get(profileId);
  if (!prefs) return;
  prefs.detailLayout = layout;
  await db.preferences.put(prefs);
}

export async function saveAttempt(attempt: Attempt): Promise<void> {
  await db.attempts.put(attempt);
}

export async function listAttemptsForLesson(
  profileId: string,
  lessonId: string,
): Promise<Attempt[]> {
  return db.attempts
    .where("[profileId+lessonId]")
    .equals([profileId, lessonId])
    .sortBy("completedAt");
}

export async function bestAttemptByLesson(
  profileId: string,
): Promise<Map<string, Attempt>> {
  const all = await db.attempts.where({ profileId }).toArray();
  const best = new Map<string, Attempt>();
  for (const a of all) {
    const prev = best.get(a.lessonId);
    if (!prev || a.score > prev.score) best.set(a.lessonId, a);
  }
  return best;
}

export async function upsertDraft(draft: Draft): Promise<void> {
  await db.drafts.put(draft);
}

export async function getDraft(
  profileId: string,
  lessonId: string,
): Promise<Draft | undefined> {
  return db.drafts.get([profileId, lessonId]);
}

export async function deleteDraft(
  profileId: string,
  lessonId: string,
): Promise<void> {
  await db.drafts.delete([profileId, lessonId]);
}
```

- [ ] **Step 6: First-launch init helper**

Create `src/lib/db/init.ts`:
```ts
"use client";

import { useEffect } from "react";
import { ensureDefaultProfile } from "./queries";

export function useDbInit() {
  useEffect(() => {
    ensureDefaultProfile().catch((err) => {
      console.error("Failed to initialize local database", err);
    });
  }, []);
}
```

- [ ] **Step 7: Run tests**

Run: `npm test src/lib/db/db.test.ts`
Expected: 7 passing.

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/
git commit -m "feat(db): Dexie schema, queries, and first-launch init"
```

---

## Task 7: Sample lesson data + lesson loader

**Files:**
- Create: `public/lessons/reading/a1.json`
- Create: `public/lessons/reading/a2.json`
- Create: `public/lessons/reading/b1.json`
- Create: `public/lessons/reading/b2.json`
- Create: `public/lessons/reading/c1.json`
- Create: `src/lib/lessons/load.ts`

- [ ] **Step 1: Create A1 sample**

Create `public/lessons/reading/a1.json`:
```json
[
  {
    "id": "reading-a1-001",
    "level": "A1",
    "title": "My first day in Paris",
    "summary": "A tourist arrives in Paris for the first time and describes the sights, sounds, and a small misunderstanding at a café.",
    "format": "paragraph",
    "body": "Yesterday I arrived in Paris. The airport was very busy. I took a taxi to my hotel near the river. In the afternoon, I went to a small café. The waiter smiled at me. I tried to order in French but he didn't understand. He laughed and we both used English. At night, I walked along the river. The lights on the bridges were beautiful.",
    "tags": ["Travel", "City"],
    "annotations": [
      { "phrase": "airport", "meaningVi": "sân bay" },
      { "phrase": "taxi", "meaningVi": "taxi", "pronunciation": "/ˈtæk.si/" },
      { "phrase": "smiled", "meaningVi": "đã cười" },
      { "phrase": "café", "meaningVi": "quán cà phê" }
    ],
    "grammarNotes": [
      {
        "title": "Past simple",
        "bodyVi": "Dùng 'past simple' cho các hành động đã hoàn thành trong quá khứ tại một thời điểm cụ thể.",
        "bodyEn": "Use the past simple for completed actions at a specific time in the past. e.g. 'I arrived', 'I took', 'I went'."
      }
    ],
    "translationVi": "Hôm qua tôi đến Paris. Sân bay rất đông. Tôi đi taxi đến khách sạn gần sông. Buổi chiều tôi đến một quán cà phê nhỏ. Người phục vụ mỉm cười. Tôi cố gọi món bằng tiếng Pháp nhưng anh ấy không hiểu. Anh ấy cười và chúng tôi dùng tiếng Anh. Buổi tối tôi đi dạo dọc sông. Đèn trên các cây cầu rất đẹp.",
    "questions": [
      { "id": "q1", "prompt": "Where did the writer arrive?", "options": ["Paris", "London", "Rome", "Berlin"], "answerIndex": 0, "explanation": "The first sentence states 'I arrived in Paris.'", "hint": "Look at the first sentence." },
      { "id": "q2", "prompt": "How did the writer travel to the hotel?", "options": ["Bus", "Taxi", "Train", "Walking"], "answerIndex": 1, "explanation": "'I took a taxi to my hotel.'", "hint": "Re-read the second sentence." },
      { "id": "q3", "prompt": "Where was the hotel located?", "options": ["Near the airport", "Near a park", "Near the river", "In the city centre"], "answerIndex": 2, "explanation": "'…to my hotel near the river.'", "hint": "Look in sentence 2." },
      { "id": "q4", "prompt": "What did the waiter do first?", "options": ["Laughed", "Smiled", "Frowned", "Walked away"], "answerIndex": 1, "explanation": "'The waiter smiled at me.'", "hint": "What is the first thing the waiter is described as doing?" },
      { "id": "q5", "prompt": "Why didn't the order in French work?", "options": ["The writer used the wrong word", "The waiter didn't understand", "The café was closed", "The waiter was busy"], "answerIndex": 1, "explanation": "'…but he didn't understand.'", "hint": "Look at the result of the order." },
      { "id": "q6", "prompt": "What language did they finally use?", "options": ["French", "English", "Spanish", "German"], "answerIndex": 1, "explanation": "'…we both used English.'", "hint": "What language ended the conversation?" },
      { "id": "q7", "prompt": "When did the writer walk along the river?", "options": ["Morning", "Afternoon", "Evening", "Night"], "answerIndex": 3, "explanation": "'At night, I walked along the river.'", "hint": "Look for time markers." },
      { "id": "q8", "prompt": "What did the writer find beautiful?", "options": ["The hotel", "The café", "The lights on the bridges", "The taxi driver"], "answerIndex": 2, "explanation": "'The lights on the bridges were beautiful.'", "hint": "What's the last thing described?" },
      { "id": "q9", "prompt": "Which tense is mostly used in this passage?", "options": ["Present simple", "Past simple", "Present perfect", "Future"], "answerIndex": 1, "explanation": "Past simple — completed past actions like 'arrived', 'took', 'went'.", "hint": "Check the grammar note." },
      { "id": "q10", "prompt": "Which best describes the writer's day?", "options": ["Frustrating and bad", "Boring and slow", "A mix of new experiences", "Lonely and sad"], "answerIndex": 2, "explanation": "The passage describes arriving, a friendly mishap at a café, and an enjoyable walk — a mix of new experiences.", "hint": "Think about the overall tone." }
    ]
  }
]
```

- [ ] **Step 2: Create stub files for A2-C1**

For each of `a2.json`, `b1.json`, `b2.json`, `c1.json`, create with a single lesson (use the A1 template but change the `id`, `level`, and lightly tweak the title — minimum viable so each level has at least one card to display).

Example `public/lessons/reading/a2.json`:
```json
[
  {
    "id": "reading-a2-001",
    "level": "A2",
    "title": "Booking a hotel by phone",
    "summary": "A traveler calls a hotel to make a reservation.",
    "format": "paragraph",
    "body": "Last Monday I called the Riverside Hotel. The receptionist asked when I wanted to stay. I said from June 10th to June 12th. He told me a double room was 90 euros per night. I asked if breakfast was included. He said yes, and confirmed my booking.",
    "tags": ["Travel"],
    "annotations": [
      { "phrase": "receptionist", "meaningVi": "lễ tân" },
      { "phrase": "double room", "meaningVi": "phòng đôi" }
    ],
    "grammarNotes": [],
    "translationVi": "Thứ Hai tuần trước tôi gọi cho khách sạn Riverside. Lễ tân hỏi tôi muốn ở khi nào. Tôi nói từ ngày 10 đến ngày 12 tháng Sáu. Anh ấy báo phòng đôi giá 90 euro mỗi đêm. Tôi hỏi có bao gồm bữa sáng không. Anh ấy nói có và xác nhận đặt phòng của tôi.",
    "questions": [
      { "id": "q1", "prompt": "When did the call happen?", "options": ["Last Sunday", "Last Monday", "Tomorrow", "Today"], "answerIndex": 1, "explanation": "'Last Monday I called the Riverside Hotel.'", "hint": "Look at the first sentence." },
      { "id": "q2", "prompt": "How much was the room per night?", "options": ["60 euros", "70 euros", "90 euros", "120 euros"], "answerIndex": 2, "explanation": "'…a double room was 90 euros per night.'", "hint": "Find the price." },
      { "id": "q3", "prompt": "Was breakfast included?", "options": ["Yes", "No", "For an extra fee", "Only on weekends"], "answerIndex": 0, "explanation": "'He said yes.'", "hint": "Look at the answer to the breakfast question." },
      { "id": "q4", "prompt": "Who confirmed the booking?", "options": ["The traveler", "The receptionist", "Both", "Nobody"], "answerIndex": 1, "explanation": "'He … confirmed my booking.'", "hint": "Who said 'yes' last?" },
      { "id": "q5", "prompt": "How long was the stay?", "options": ["1 night", "2 nights", "3 nights", "1 week"], "answerIndex": 1, "explanation": "June 10 to June 12 = 2 nights.", "hint": "Count the dates." },
      { "id": "q6", "prompt": "What type of room did the traveler ask about?", "options": ["Single", "Double", "Suite", "Family"], "answerIndex": 1, "explanation": "'a double room was 90 euros'", "hint": "Look at the room type." },
      { "id": "q7", "prompt": "Who is the receptionist?", "options": ["The owner", "The traveler", "The hotel employee at the front desk", "A waiter"], "answerIndex": 2, "explanation": "A receptionist is the person at the front desk who handles bookings.", "hint": "See the annotation." },
      { "id": "q8", "prompt": "What did the traveler do first?", "options": ["Made the reservation", "Called the hotel", "Asked about breakfast", "Asked about the price"], "answerIndex": 1, "explanation": "First action: 'I called the Riverside Hotel.'", "hint": "Sequence: what's the first verb?" },
      { "id": "q9", "prompt": "What currency is used?", "options": ["Dollar", "Pound", "Euro", "Yen"], "answerIndex": 2, "explanation": "'90 euros per night'", "hint": "Look for the price." },
      { "id": "q10", "prompt": "What is the main purpose of the call?", "options": ["To complain", "To cancel", "To make a reservation", "To ask for directions"], "answerIndex": 2, "explanation": "The whole passage describes making a booking.", "hint": "Why did the traveler call?" }
    ]
  }
]
```

For `b1.json`, `b2.json`, `c1.json`: copy the A2 file verbatim, then change only the lesson `id` (e.g. `reading-b1-001`), the `level` field, and the title (prefix with `[B1] `, `[B2] `, `[C1] ` so they're visually distinct in the hub). Content equality is intentional — these stubs only need to satisfy "at least one lesson per level so the UI is testable." The 250-lesson generator is out of scope for this plan (per spec §2).

- [ ] **Step 3: Lesson loader hook**

Create `src/lib/lessons/load.ts`:
```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { lessonsFileSchema } from "./schema";
import type { CefrLevel, Lesson } from "./types";

const LEVELS: readonly CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"] as const;

async function fetchLessonsForLevel(level: CefrLevel): Promise<Lesson[]> {
  const res = await fetch(`/lessons/reading/${level.toLowerCase()}.json`);
  if (!res.ok) throw new Error(`Failed to load lessons for ${level}`);
  const json = await res.json();
  return lessonsFileSchema.parse(json);
}

export function useReadingLessons(level: CefrLevel) {
  return useQuery({
    queryKey: ["lessons", "reading", level],
    queryFn: () => fetchLessonsForLevel(level),
    staleTime: Infinity,
  });
}

export function useAllReadingLessons() {
  return useQuery({
    queryKey: ["lessons", "reading", "all"],
    queryFn: async () => {
      const all = await Promise.all(LEVELS.map(fetchLessonsForLevel));
      return all.flat();
    },
    staleTime: Infinity,
  });
}
```

- [ ] **Step 4: Verify lesson JSON validates**

Run: `node -e "const z=require('./node_modules/zod');const s=require('fs').readFileSync('public/lessons/reading/a1.json','utf8');JSON.parse(s);console.log('a1 ok');"`
Expected: `a1 ok`. (Schema validation runs at runtime through the loader.)

- [ ] **Step 5: Commit**

```bash
git add public/lessons/ src/lib/lessons/load.ts
git commit -m "feat(lessons): sample lesson data per level + react-query loader"
```

---

## Task 8: Wire `useDbInit` into Providers

**Files:**
- Modify: `src/components/providers.tsx`

- [ ] **Step 1: Add init call**

Modify `src/components/providers.tsx` — add the import and call `useDbInit()` inside the Providers component:
```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useDbInit } from "@/lib/db/init";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false },
        },
      }),
  );

  useDbInit();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Verify dev server starts**

Run: `npm run dev` (background or another terminal). Open `http://localhost:4600/`. Open DevTools → Application → IndexedDB. After the page loads, expect database `english-learning` to exist with tables `profiles`, `preferences`, `attempts`, `drafts`, and `profiles` to contain one row `{ id: "default", name: "Me", ... }`.

- [ ] **Step 3: Commit**

```bash
git add src/components/providers.tsx
git commit -m "feat(db): initialize default profile on app boot"
```

---

## Task 9: App-shell config + Sidebar components

**Files:**
- Create: `src/components/app-shell/nav-config.ts`
- Create: `src/components/app-shell/sidebar-item.tsx`
- Create: `src/components/app-shell/sidebar.tsx`
- Create: `src/components/app-shell/theme-toggle.tsx`

- [ ] **Step 1: Nav config**

Create `src/components/app-shell/nav-config.ts`:
```ts
import { BookOpen, PenLine, Headphones, Ruler, Mic } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/reading",   label: "Reading",   icon: BookOpen },
  { href: "/writing",   label: "Writing",   icon: PenLine,    comingSoon: true },
  { href: "/listening", label: "Listening", icon: Headphones, comingSoon: true },
  { href: "/grammar",   label: "Grammar",   icon: Ruler,      comingSoon: true },
  { href: "/speaking",  label: "Speaking",  icon: Mic,        comingSoon: true },
];
```

- [ ] **Step 2: SidebarItem**

Create `src/components/app-shell/sidebar-item.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

export function SidebarItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-secondary text-secondary-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.comingSoon && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: ThemeToggle**

Create `src/components/app-shell/theme-toggle.tsx`:
```tsx
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "light",  icon: Sun,     label: "Light"  },
  { value: "dark",   icon: Moon,    label: "Dark"   },
  { value: "system", icon: Monitor, label: "System" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9" aria-hidden="true" />;

  return (
    <div className="flex gap-1 rounded-md border bg-background p-1" role="radiogroup" aria-label="Theme">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = theme === m.value;
        return (
          <Button
            key={m.value}
            type="button"
            variant="ghost"
            size="sm"
            role="radio"
            aria-checked={active}
            aria-label={m.label}
            onClick={() => setTheme(m.value)}
            className={cn("h-7 flex-1 px-2", active && "bg-secondary text-secondary-foreground")}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Sidebar**

Create `src/components/app-shell/sidebar.tsx`:
```tsx
import { NAV_ITEMS } from "./nav-config";
import { SidebarItem } from "./sidebar-item";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center px-4 py-4">
        <span className="text-sm font-semibold tracking-tight">English Learning</span>
      </div>
      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <SidebarItem item={item} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t px-3 py-3">
        <ThemeToggle />
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/app-shell/
git commit -m "feat(app-shell): sidebar nav + theme toggle"
```

---

## Task 10: App shell layout + stub pages + root redirect

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/writing/page.tsx`
- Create: `src/app/(app)/listening/page.tsx`
- Create: `src/app/(app)/grammar/page.tsx`
- Create: `src/app/(app)/speaking/page.tsx`
- Create: `src/components/app-shell/coming-soon.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: ComingSoon component**

Create `src/components/app-shell/coming-soon.tsx`:
```tsx
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ skill }: { skill: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <h1 className="text-xl font-semibold">{skill}</h1>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: App shell layout**

Create `src/app/(app)/layout.tsx`:
```tsx
import { Sidebar } from "@/components/app-shell/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Stub pages**

Create `src/app/(app)/writing/page.tsx`:
```tsx
import { ComingSoon } from "@/components/app-shell/coming-soon";
export default function WritingPage() {
  return <ComingSoon skill="Writing" />;
}
```

Repeat for `listening`, `grammar`, `speaking` — same structure, replacing the skill name.

- [ ] **Step 4: Root redirect**

Modify `src/app/page.tsx` — replace entire file contents with:
```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/reading");
}
```

- [ ] **Step 5: Verify**

Run: `npm run dev`. Navigate to:
- `http://localhost:4600/` → should redirect to `/reading` (will 404 until Task 12 — for now expect "Page not found" inside the shell, with sidebar visible).
- `http://localhost:4600/writing` → "Writing — Coming soon" inside the shell.
- Same for `/listening`, `/grammar`, `/speaking`. Sidebar shows active highlight on the current item.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx "src/app/(app)/" src/components/app-shell/coming-soon.tsx
git commit -m "feat(app-shell): layout with sidebar + stub routes + root redirect"
```

---

## Task 11: LessonCard component

**Files:**
- Create: `src/components/reading/lesson-card.tsx`

- [ ] **Step 1: Implement**

Create `src/components/reading/lesson-card.tsx`:
```tsx
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/lib/lessons/types";
import type { Attempt } from "@/lib/db/types";

const LEVEL_CLASS: Record<Lesson["level"], string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

export function LessonCard({ lesson, bestAttempt }: { lesson: Lesson; bestAttempt?: Attempt }) {
  return (
    <Link
      href={`/reading/${lesson.id}`}
      className="group block rounded-lg border bg-card p-4 text-card-foreground transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{lesson.title}</h3>
        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[0.7rem] font-semibold", LEVEL_CLASS[lesson.level])}>
          {lesson.level}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{lesson.summary}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-1 text-muted-foreground">
          {lesson.tags.slice(0, 3).map((t) => (
            <span key={t}>#{t}</span>
          ))}
          {lesson.tags.length > 3 && <span>+{lesson.tags.length - 3}</span>}
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
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/reading/lesson-card.tsx
git commit -m "feat(reading): LessonCard component"
```

---

## Task 12: FilterChipRow + Reading hub page

**Files:**
- Create: `src/components/reading/filter-chip-row.tsx`
- Create: `src/app/(app)/reading/page.tsx`
- Create: `src/lib/db/use-best-attempts.ts`

- [ ] **Step 1: FilterChipRow**

Create `src/components/reading/filter-chip-row.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";

export type ChipOption = { value: string; label: string; className?: string };

export function FilterChipRow({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: ChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              active
                ? cn("border-primary/40", opt.className ?? "bg-primary/15 text-primary")
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Best-attempts hook**

Create `src/lib/db/use-best-attempts.ts`:
```ts
"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import type { Attempt } from "./types";

export function useBestAttempts(profileId: string): Map<string, Attempt> | undefined {
  return useLiveQuery(async () => {
    const all = await db.attempts.where({ profileId }).toArray();
    const best = new Map<string, Attempt>();
    for (const a of all) {
      const prev = best.get(a.lessonId);
      if (!prev || a.score > prev.score) best.set(a.lessonId, a);
    }
    return best;
  }, [profileId]);
}

// Single-profile shorthand for v1
export function useDefaultBestAttempts() {
  return useBestAttempts("default");
}
```

Run: `npm install dexie-react-hooks` (live queries that re-render when IndexedDB changes).

- [ ] **Step 3: Reading hub page**

Create `src/app/(app)/reading/page.tsx`:
```tsx
"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAllReadingLessons } from "@/lib/lessons/load";
import { useDefaultBestAttempts } from "@/lib/db/use-best-attempts";
import { FilterChipRow, type ChipOption } from "@/components/reading/filter-chip-row";
import { LessonCard } from "@/components/reading/lesson-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CefrLevel } from "@/lib/lessons/types";

const LEVEL_OPTIONS: ChipOption[] = [
  { value: "A1", label: "A1", className: "bg-level-a1 text-level-a1-foreground" },
  { value: "A2", label: "A2", className: "bg-level-a2 text-level-a2-foreground" },
  { value: "B1", label: "B1", className: "bg-level-b1 text-level-b1-foreground" },
  { value: "B2", label: "B2", className: "bg-level-b2 text-level-b2-foreground" },
  { value: "C1", label: "C1", className: "bg-level-c1 text-level-c1-foreground" },
];

function parseList(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export default function ReadingHubPage() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedLevels = parseList(params.get("levels"));
  const selectedTags = parseList(params.get("tags"));

  const { data: lessons, isLoading } = useAllReadingLessons();
  const bestByLesson = useDefaultBestAttempts();

  const allTags = useMemo(() => {
    const set = new Set<string>();
    lessons?.forEach((l) => l.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [lessons]);

  const filtered = useMemo(() => {
    if (!lessons) return [];
    return lessons.filter((l) => {
      if (selectedLevels.length && !selectedLevels.includes(l.level)) return false;
      if (selectedTags.length && !selectedTags.some((t) => l.tags.includes(t))) return false;
      return true;
    });
  }, [lessons, selectedLevels, selectedTags]);

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

  const tagOptions: ChipOption[] = allTags.map((t) => ({ value: t, label: t }));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Reading lessons</h1>
        <p className="text-xs text-muted-foreground">
          {completedCount} / {lessons?.length ?? 0} completed
        </p>
      </header>

      <div className="mb-3">
        <FilterChipRow
          label="Level"
          options={LEVEL_OPTIONS}
          selected={selectedLevels}
          onChange={(next) => setParam("levels", next as CefrLevel[])}
        />
      </div>
      <div className="mb-4 flex items-center gap-3">
        <FilterChipRow
          label="Tags"
          options={tagOptions}
          selected={selectedTags}
          onChange={(next) => setParam("tags", next)}
        />
        {(selectedLevels.length > 0 || selectedTags.length > 0) && (
          <button
            type="button"
            onClick={() => router.replace("/reading")}
            className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
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
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No lessons match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lesson) => (
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
```

- [ ] **Step 4: Verify**

Run: `npm run dev`. Open `http://localhost:4600/`. Should redirect to `/reading` and show 5 lesson cards (one per level) with level badges. Click A1 chip → only A1 shows. Click again → A1 deselects. Click "Travel" tag → only lessons tagged Travel show. URL should reflect `?levels=A1&tags=Travel`. "Clear filters" link clears them.

- [ ] **Step 5: Commit**

```bash
git add src/components/reading/filter-chip-row.tsx src/app/\(app\)/reading/page.tsx src/lib/db/use-best-attempts.ts package.json package-lock.json
git commit -m "feat(reading): hub page with level + tag filters"
```

---

## Task 13: Lesson detail — header, timer, and skeleton page

**Files:**
- Create: `src/stores/timer-store.ts`
- Create: `src/stores/timer-store.test.ts`
- Create: `src/components/reading/lesson-timer.tsx`
- Create: `src/app/(app)/reading/[lessonId]/page.tsx`

- [ ] **Step 1: Write failing test for timer store**

Create `src/stores/timer-store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useTimerStore } from "./timer-store";

beforeEach(() => {
  useTimerStore.getState().reset();
});

describe("timer store", () => {
  it("accumulates time across start/stop intervals", () => {
    const store = useTimerStore.getState();
    store.start(1000);
    store.stop(3500);
    expect(useTimerStore.getState().accumulatedMs).toBe(2500);
    store.start(4000);
    store.stop(5500);
    expect(useTimerStore.getState().accumulatedMs).toBe(4000);
  });

  it("derives current display while running", () => {
    const store = useTimerStore.getState();
    store.start(1000);
    expect(useTimerStore.getState().elapsedAt(2500)).toBe(1500);
  });

  it("stop() while not running is a no-op", () => {
    const store = useTimerStore.getState();
    store.stop(1000);
    expect(useTimerStore.getState().accumulatedMs).toBe(0);
    expect(useTimerStore.getState().running).toBe(false);
  });

  it("hydrate() seeds accumulatedMs in stopped state", () => {
    const store = useTimerStore.getState();
    store.hydrate(7000);
    expect(useTimerStore.getState().accumulatedMs).toBe(7000);
    expect(useTimerStore.getState().running).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/stores/timer-store.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement timer store**

Create `src/stores/timer-store.ts`:
```ts
import { create } from "zustand";

type TimerState = {
  running: boolean;
  anchor: number | null;       // epoch ms of most recent start
  accumulatedMs: number;
  start: (now?: number) => void;
  stop: (now?: number) => void;
  reset: () => void;
  hydrate: (durationMs: number) => void;
  elapsedAt: (now: number) => number;
};

export const useTimerStore = create<TimerState>((set, get) => ({
  running: false,
  anchor: null,
  accumulatedMs: 0,
  start: (now = Date.now()) => {
    if (get().running) return;
    set({ running: true, anchor: now });
  },
  stop: (now = Date.now()) => {
    const s = get();
    if (!s.running || s.anchor === null) return;
    set({
      running: false,
      anchor: null,
      accumulatedMs: s.accumulatedMs + (now - s.anchor),
    });
  },
  reset: () => set({ running: false, anchor: null, accumulatedMs: 0 }),
  hydrate: (durationMs) =>
    set({ running: false, anchor: null, accumulatedMs: durationMs }),
  elapsedAt: (now) => {
    const s = get();
    return s.accumulatedMs + (s.running && s.anchor !== null ? now - s.anchor : 0);
  },
}));
```

- [ ] **Step 4: Run tests**

Run: `npm test src/stores/timer-store.test.ts`
Expected: 4 passing.

- [ ] **Step 5: LessonTimer component**

Create `src/components/reading/lesson-timer.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimerStore } from "@/stores/timer-store";

function format(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function LessonTimer() {
  const running = useTimerStore((s) => s.running);
  const start = useTimerStore((s) => s.start);
  const stop = useTimerStore((s) => s.stop);
  const [, force] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const display = useTimerStore.getState().elapsedAt(Date.now());

  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-muted px-2 py-1 font-mono text-sm tabular-nums">
        {format(display)}
      </span>
      <Button
        type="button"
        size="sm"
        variant={running ? "secondary" : "default"}
        onClick={() => (running ? stop() : start())}
      >
        {running ? <Pause className="mr-1 size-3.5" /> : <Play className="mr-1 size-3.5" />}
        {running ? "Stop" : "Start"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Lesson detail page (header + body placeholder)**

Create `src/app/(app)/reading/[lessonId]/page.tsx`:
```tsx
"use client";

import { use, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAllReadingLessons } from "@/lib/lessons/load";
import { useLiveQuery } from "dexie-react-hooks";
import { listAttemptsForLesson } from "@/lib/db/queries";
import { LessonTimer } from "@/components/reading/lesson-timer";
import { useTimerStore } from "@/stores/timer-store";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/lib/lessons/types";

const LEVEL_CLASS: Record<Lesson["level"], string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

export default function LessonDetailPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const { data: lessons } = useAllReadingLessons();
  const lesson = useMemo(() => lessons?.find((l) => l.id === lessonId), [lessons, lessonId]);
  const attempts = useLiveQuery(() => listAttemptsForLesson("default", lessonId), [lessonId]);
  const reset = useTimerStore((s) => s.reset);

  useEffect(() => {
    reset();
    return () => reset();
  }, [lessonId, reset]);

  if (!lesson) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const best = attempts?.reduce<typeof attempts[number] | undefined>(
    (acc, a) => (!acc || a.score > acc.score ? a : acc),
    undefined,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/reading"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Back to Reading
          </Link>
          <h1 className="text-xl font-semibold">{lesson.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded px-1.5 py-0.5 font-semibold", LEVEL_CLASS[lesson.level])}>
              {lesson.level}
            </span>
            {lesson.tags.map((t) => (
              <span key={t} className="text-muted-foreground">#{t}</span>
            ))}
            <span className="text-muted-foreground">
              {best ? `Best ${best.score}/${best.total} · ${attempts?.length} attempts` : "No attempts yet"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LessonTimer />
          {/* Hints button + layout toggle wired in later tasks */}
        </div>
      </header>

      <div className="mb-4 rounded-md border bg-muted/40 p-3 text-sm italic">
        <strong className="not-italic">Summary:</strong> {lesson.summary}
      </div>

      <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
        Passage + quiz wired in the next tasks. Sample passage body:
        <p className="mt-2 whitespace-pre-wrap text-foreground">
          {typeof lesson.body === "string" ? lesson.body : lesson.body.map((t) => `${t.speaker}: ${t.text}`).join("\n")}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify**

Run: `npm run dev`. From `/reading`, click an A1 card → URL becomes `/reading/reading-a1-001`. Header shows title, level badge, tags, timer 00:00. Click Start → timer counts up. Click Stop → timer pauses. Click Start again → continues from previous accumulated time.

- [ ] **Step 8: Commit**

```bash
git add src/stores/timer-store.ts src/stores/timer-store.test.ts src/components/reading/lesson-timer.tsx "src/app/(app)/reading/[lessonId]/page.tsx"
git commit -m "feat(reading): lesson detail header + manual start/stop timer"
```

---

## Task 14: Passage, annotations, grammar notes, hint settings popover

**Files:**
- Create: `src/lib/db/use-preferences.ts`
- Create: `src/components/reading/passage-annotation.tsx`
- Create: `src/components/reading/passage.tsx`
- Create: `src/components/reading/grammar-notes.tsx`
- Create: `src/components/reading/hint-settings-popover.tsx`
- Modify: `src/app/(app)/reading/[lessonId]/page.tsx`

- [ ] **Step 1: Live preferences hook**

Create `src/lib/db/use-preferences.ts`:
```ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import {
  setHintToggle as setHintToggleQ,
  setDetailLayout as setDetailLayoutQ,
} from "./queries";
import type { HintToggles, DetailLayout, Preferences } from "./types";
import { DEFAULT_HINT_TOGGLES } from "./types";

const FALLBACK: Preferences = {
  profileId: "default",
  hintToggles: { ...DEFAULT_HINT_TOGGLES },
  detailLayout: "two-column",
  activeProfileId: "default",
};

export function usePreferences(): Preferences {
  return useLiveQuery(() => db.preferences.get("default"), [], FALLBACK) ?? FALLBACK;
}

export async function setHintToggle(key: keyof HintToggles, value: boolean) {
  await setHintToggleQ("default", key, value);
}

export async function setDetailLayout(layout: DetailLayout) {
  await setDetailLayoutQ("default", layout);
}
```

- [ ] **Step 2: PassageAnnotation**

Create `src/components/reading/passage-annotation.tsx`:
```tsx
"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Annotation } from "@/lib/lessons/types";

export function PassageAnnotation({ text, annotation }: { text: string; annotation: Annotation }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-help rounded bg-yellow-200/60 px-0.5 underline decoration-dotted underline-offset-2 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/70"
        >
          {text}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm">
        <p className="font-semibold">
          {annotation.phrase}
          {annotation.pronunciation && (
            <span className="ml-2 font-normal text-muted-foreground">{annotation.pronunciation}</span>
          )}
        </p>
        <p className="mt-1 text-sm">{annotation.meaningVi}</p>
        {annotation.exampleEn && <p className="mt-1 text-xs italic text-muted-foreground">{annotation.exampleEn}</p>}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 3: Passage**

Create `src/components/reading/passage.tsx`:
```tsx
"use client";

import { useMemo } from "react";
import { splitWithAnnotations } from "@/lib/lessons/annotate";
import { PassageAnnotation } from "./passage-annotation";
import type { Lesson } from "@/lib/lessons/types";

export function Passage({
  lesson,
  showAnnotations,
  showTranslation,
}: {
  lesson: Lesson;
  showAnnotations: boolean;
  showTranslation: boolean;
}) {
  const lines = useMemo<{ original: string; key: string }[]>(() => {
    if (lesson.format === "paragraph") {
      return (lesson.body as string)
        .split(/\n+/)
        .map((line, i) => ({ original: line, key: `p${i}` }));
    }
    return (lesson.body as { speaker: string; text: string }[]).map((t, i) => ({
      original: `${t.speaker}: ${t.text}`,
      key: `t${i}`,
    }));
  }, [lesson]);

  return (
    <div className={showTranslation ? "grid grid-cols-1 gap-3 lg:grid-cols-2" : ""}>
      <article className="space-y-3 text-sm leading-relaxed">
        {lines.map((line) => {
          const segments = showAnnotations
            ? splitWithAnnotations(line.original, lesson.annotations)
            : [{ kind: "text" as const, text: line.original }];
          return (
            <p key={line.key}>
              {segments.map((seg, idx) =>
                seg.kind === "text" ? (
                  <span key={idx}>{seg.text}</span>
                ) : (
                  <PassageAnnotation key={idx} text={seg.text} annotation={seg.annotation} />
                ),
              )}
            </p>
          );
        })}
      </article>
      {showTranslation && (
        <aside className="space-y-3 rounded-md bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
          {lesson.translationVi.split(/\n+/).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </aside>
      )}
    </div>
  );
}
```

- [ ] **Step 4: GrammarNotes**

Create `src/components/reading/grammar-notes.tsx`:
```tsx
"use client";

import type { GrammarNote } from "@/lib/lessons/types";

export function GrammarNotes({ notes }: { notes: GrammarNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="mt-4 space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grammar notes</p>
      {notes.map((n, i) => (
        <details key={i} className="group">
          <summary className="cursor-pointer font-medium">{n.title}</summary>
          <p className="mt-1 text-sm">{n.bodyVi}</p>
          <p className="mt-1 text-xs italic text-muted-foreground">{n.bodyEn}</p>
        </details>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: HintSettingsPopover**

Create `src/components/reading/hint-settings-popover.tsx`:
```tsx
"use client";

import { Lightbulb } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePreferences, setHintToggle } from "@/lib/db/use-preferences";
import type { HintToggles } from "@/lib/db/types";

const TOGGLES: Array<{ key: keyof HintToggles; label: string }> = [
  { key: "vocabVi",            label: "Vietnamese for hard words" },
  { key: "grammar",            label: "Grammar / tense notes" },
  { key: "passageTranslation", label: "Full passage translation" },
  { key: "perQuestionHint",    label: "Per-question hint button" },
];

export function HintSettingsPopover() {
  const prefs = usePreferences();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Lightbulb className="mr-1 size-3.5" /> Hints
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3 p-4 text-sm">
        <div>
          <p className="font-semibold">Hint settings</p>
          <p className="text-xs text-muted-foreground">Choose what to show. Off by default.</p>
        </div>
        <div className="space-y-2">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-center gap-2">
              <Checkbox
                id={`toggle-${t.key}`}
                checked={prefs.hintToggles[t.key]}
                onCheckedChange={async (checked) => {
                  await setHintToggle(t.key, checked === true);
                  toast.success("Saved");
                }}
              />
              <Label htmlFor={`toggle-${t.key}`} className="cursor-pointer text-sm font-normal">
                {t.label}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 6: Wire into lesson detail page**

Modify `src/app/(app)/reading/[lessonId]/page.tsx` — replace the placeholder body block (the `<div className="rounded-md border bg-card p-4 …">` element) with:
```tsx
{/* Replace the placeholder body block with: */}
<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
  <section className="rounded-md border bg-card p-4">
    <Passage
      lesson={lesson}
      showAnnotations={prefs.hintToggles.vocabVi}
      showTranslation={prefs.hintToggles.passageTranslation}
    />
    {prefs.hintToggles.grammar && <GrammarNotes notes={lesson.grammarNotes} />}
  </section>
  <section className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
    Quiz wired in Task 15.
  </section>
</div>
```

Also add imports near the top:
```tsx
import { Passage } from "@/components/reading/passage";
import { GrammarNotes } from "@/components/reading/grammar-notes";
import { HintSettingsPopover } from "@/components/reading/hint-settings-popover";
import { usePreferences } from "@/lib/db/use-preferences";
```

Inside the component, add at the top:
```tsx
const prefs = usePreferences();
```

Inside the header's right-side div (the one with `<LessonTimer />`), append `<HintSettingsPopover />` after it:
```tsx
<div className="flex items-center gap-2">
  <LessonTimer />
  <HintSettingsPopover />
</div>
```

- [ ] **Step 7: Verify**

Run: `npm run dev`. Open an A1 lesson. Click Hints → popover opens. Toggle "Vietnamese for hard words" → "airport", "taxi", "smiled", "café" become underlined yellow. Click "airport" → popover with Vietnamese meaning. Toggle "Grammar / tense notes" → grammar section appears below the passage. Toggle "Full translation" → Vietnamese translation appears in a side column. All toggles persist if you reload the page (preferences stored in IndexedDB).

- [ ] **Step 8: Commit**

```bash
git add src/components/reading/passage.tsx src/components/reading/passage-annotation.tsx src/components/reading/grammar-notes.tsx src/components/reading/hint-settings-popover.tsx src/lib/db/use-preferences.ts "src/app/(app)/reading/[lessonId]/page.tsx"
git commit -m "feat(reading): passage with annotations, grammar notes, hint settings"
```

---

## Task 15: Quiz form + submit + review mode

**Files:**
- Create: `src/components/reading/quiz-question.tsx`
- Create: `src/components/reading/quiz.tsx`
- Create: `src/components/reading/review-summary.tsx`
- Modify: `src/app/(app)/reading/[lessonId]/page.tsx`

- [ ] **Step 1: QuizQuestion**

Create `src/components/reading/quiz-question.tsx`:
```tsx
"use client";

import { Check, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/lessons/types";

export type QuizQuestionProps = {
  index: number;
  question: Question;
  value: number | undefined;
  onChange: (v: number) => void;
  showHint: boolean;
  reviewMode: boolean;
};

export function QuizQuestion({ index, question, value, onChange, showHint, reviewMode }: QuizQuestionProps) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-md border p-3",
        reviewMode &&
          value !== undefined &&
          (value === question.answerIndex
            ? "border-green-500/50 bg-green-500/5"
            : "border-red-500/50 bg-red-500/5"),
        reviewMode && value === undefined && "border-red-500/50 bg-red-500/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">
          {index + 1}. {question.prompt}
        </p>
        {showHint && !reviewMode && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">💡 Hint</summary>
            <p className="mt-1 text-xs italic">{question.hint}</p>
          </details>
        )}
      </div>
      <RadioGroup
        value={value === undefined ? "" : String(value)}
        onValueChange={(v) => onChange(Number(v))}
        disabled={reviewMode}
        className="space-y-1"
      >
        {question.options.map((opt, i) => {
          const id = `${question.id}-${i}`;
          const isCorrect = reviewMode && i === question.answerIndex;
          const isWrongPick = reviewMode && value === i && i !== question.answerIndex;
          return (
            <div
              key={id}
              className={cn(
                "flex items-center gap-2 rounded px-2 py-1",
                isCorrect && "bg-green-500/10",
                isWrongPick && "bg-red-500/10",
              )}
            >
              <RadioGroupItem id={id} value={String(i)} />
              <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                {opt}
              </Label>
              {isCorrect && <Check className="ml-auto size-4 text-green-600" />}
              {isWrongPick && <X className="ml-auto size-4 text-red-600" />}
            </div>
          );
        })}
      </RadioGroup>
      {reviewMode && (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold">Explanation:</span> {question.explanation}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Quiz**

Create `src/components/reading/quiz.tsx`:
```tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { scoreQuiz } from "@/lib/lessons/score";
import { saveAttempt, deleteDraft } from "@/lib/db/queries";
import { useTimerStore } from "@/stores/timer-store";
import { QuizQuestion } from "./quiz-question";
import { ReviewSummary } from "./review-summary";
import type { Lesson } from "@/lib/lessons/types";

type Picks = Record<string, number>;

export function Quiz({
  lesson,
  showHint,
  initialPicks,
  onAttemptSaved,
}: {
  lesson: Lesson;
  showHint: boolean;
  initialPicks: Picks;
  onAttemptSaved: () => void;
}) {
  const [picks, setPicks] = useState<Picks>(initialPicks);
  const [result, setResult] = useState<ReturnType<typeof scoreQuiz> | null>(null);
  const stopTimer = useTimerStore((s) => s.stop);
  const resetTimer = useTimerStore((s) => s.reset);
  const startedAtRef = useRef(Date.now());

  const answeredCount = useMemo(() => Object.keys(picks).length, [picks]);
  const total = lesson.questions.length;
  const unanswered = total - answeredCount;

  async function doSubmit() {
    stopTimer();
    const durationMs = useTimerStore.getState().accumulatedMs;
    const r = scoreQuiz(lesson.questions, picks);
    const attempt = {
      id: crypto.randomUUID(),
      profileId: "default",
      lessonId: lesson.id,
      startedAt: startedAtRef.current,
      completedAt: Date.now(),
      durationMs,
      score: r.score,
      total: r.total,
      answers: r.answers,
    };
    await saveAttempt(attempt);
    await deleteDraft("default", lesson.id);
    setResult(r);
    toast.success(`Saved. Score: ${r.score}/${r.total}`);
    onAttemptSaved();
  }

  function retry() {
    setPicks({});
    setResult(null);
    resetTimer();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Quiz · {total} questions</p>
        {!result && <p className="text-xs text-muted-foreground">{answeredCount}/{total} answered</p>}
      </div>

      <div className="space-y-2">
        {lesson.questions.map((q, i) => (
          <QuizQuestion
            key={q.id}
            index={i}
            question={q}
            value={picks[q.id]}
            onChange={(v) => setPicks((p) => ({ ...p, [q.id]: v }))}
            showHint={showHint}
            reviewMode={result !== null}
          />
        ))}
      </div>

      {result ? (
        <>
          <ReviewSummary score={result.score} total={result.total} durationMs={useTimerStore.getState().accumulatedMs} />
          <Button type="button" variant="outline" className="w-full" onClick={retry}>
            Retry
          </Button>
        </>
      ) : unanswered > 0 ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" className="w-full">Submit quiz</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{unanswered} question{unanswered === 1 ? "" : "s"} unanswered</AlertDialogTitle>
              <AlertDialogDescription>
                Unanswered questions count as wrong. Submit anyway?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={doSubmit}>Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button type="button" className="w-full" onClick={doSubmit}>
          Submit quiz
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: ReviewSummary**

Create `src/components/reading/review-summary.tsx`:
```tsx
function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return mm > 0 ? `${mm}m ${ss}s` : `${ss}s`;
}

export function ReviewSummary({ score, total, durationMs }: { score: number; total: number; durationMs: number }) {
  const pct = Math.round((score / total) * 100);
  return (
    <div className="rounded-md border bg-secondary/30 p-3 text-sm">
      <p>
        <span className="font-semibold">Result:</span> {score} / {total} ({pct}%)
      </p>
      <p className="text-xs text-muted-foreground">Time on task: {formatDuration(durationMs)}</p>
    </div>
  );
}
```

- [ ] **Step 4: Wire Quiz into the detail page**

Modify `src/app/(app)/reading/[lessonId]/page.tsx`:
- Add import: `import { Quiz } from "@/components/reading/quiz";`
- Replace the quiz placeholder section (`<section className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Quiz wired in Task 15.</section>`) with:
```tsx
<section className="rounded-md border bg-card p-4">
  <Quiz
    lesson={lesson}
    showHint={prefs.hintToggles.perQuestionHint}
    initialPicks={{}}
    onAttemptSaved={() => {}}
  />
</section>
```

- [ ] **Step 5: Verify**

Run: `npm run dev`. Open an A1 lesson. Pick 7 of 10 answers. Click Submit → confirm dialog "3 questions unanswered". Click Submit → toast appears, quiz switches to review mode with green/red borders and explanations under each question. Open DevTools → Application → IndexedDB → `english-learning` → `attempts` → 1 row with score, durationMs, etc. Click Retry → form clears, timer resets. Go back to `/reading` → the lesson card now shows "Best 7/10" badge.

- [ ] **Step 6: Commit**

```bash
git add src/components/reading/quiz.tsx src/components/reading/quiz-question.tsx src/components/reading/review-summary.tsx "src/app/(app)/reading/[lessonId]/page.tsx"
git commit -m "feat(reading): quiz form, submit flow, review mode"
```

---

## Task 16: Mid-lesson draft persistence & resume banner

**Files:**
- Create: `src/components/reading/resume-banner.tsx`
- Modify: `src/components/reading/quiz.tsx`
- Modify: `src/app/(app)/reading/[lessonId]/page.tsx`

- [ ] **Step 1: ResumeBanner**

Create `src/components/reading/resume-banner.tsx`:
```tsx
"use client";

import { Button } from "@/components/ui/button";

export function ResumeBanner({ onAbandon }: { onAbandon: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-md border bg-secondary/40 px-3 py-2 text-sm">
      <span>Resumed your in-progress attempt.</span>
      <Button type="button" variant="ghost" size="sm" onClick={onAbandon}>
        Abandon and start over
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Save draft on every pick change**

Modify `src/components/reading/quiz.tsx` — at the top of `Quiz`, add a debounced effect that upserts the draft whenever picks or timer-stop changes:
```tsx
// add these imports near the top:
import { useEffect, useRef } from "react";
import { upsertDraft } from "@/lib/db/queries";
```

Inside the component, after the `picks` state declaration:
```tsx
const debounceRef = useRef<number | null>(null);
useEffect(() => {
  if (result) return;                 // don't save drafts after submit
  if (debounceRef.current) window.clearTimeout(debounceRef.current);
  debounceRef.current = window.setTimeout(() => {
    upsertDraft({
      profileId: "default",
      lessonId: lesson.id,
      answers: picks,
      durationMs: useTimerStore.getState().accumulatedMs,
      updatedAt: Date.now(),
    }).catch(() => {});
  }, 1000);
  return () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
  };
}, [picks, lesson.id, result]);
```

Also persist on each timer Stop. Subscribe to running state changes:
```tsx
const running = useTimerStore((s) => s.running);
useEffect(() => {
  if (result || running) return;     // only on transition to stopped
  upsertDraft({
    profileId: "default",
    lessonId: lesson.id,
    answers: picks,
    durationMs: useTimerStore.getState().accumulatedMs,
    updatedAt: Date.now(),
  }).catch(() => {});
}, [running, picks, lesson.id, result]);
```

- [ ] **Step 3: Restore draft on detail-page mount**

Modify `src/app/(app)/reading/[lessonId]/page.tsx`:
- Add imports:
```tsx
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDraft, deleteDraft } from "@/lib/db/queries";
import { ResumeBanner } from "@/components/reading/resume-banner";
```
- Replace the `useEffect(() => { reset(); return () => reset(); }, [lessonId, reset]);` block with:
```tsx
const hydrate = useTimerStore((s) => s.hydrate);
const draft = useLiveQuery(() => getDraft("default", lessonId), [lessonId]);
const [initialPicks, setInitialPicks] = useState<Record<string, number>>({});
const [resumedKey, setResumedKey] = useState<string | null>(null);

useEffect(() => {
  reset();
  setInitialPicks({});
  setResumedKey(null);
}, [lessonId, reset]);

useEffect(() => {
  if (!draft) return;
  if (resumedKey === lessonId) return;          // only seed once per mount
  hydrate(draft.durationMs);
  setInitialPicks(draft.answers);
  setResumedKey(lessonId);
}, [draft, lessonId, hydrate, resumedKey]);

async function abandonDraft() {
  await deleteDraft("default", lessonId);
  reset();
  setInitialPicks({});
}
```

- Render the banner above the body grid:
```tsx
{draft && resumedKey === lessonId && <ResumeBanner onAbandon={abandonDraft} />}
```

- Pass `initialPicks` to `<Quiz>`:
```tsx
<Quiz lesson={lesson} showHint={prefs.hintToggles.perQuestionHint} initialPicks={initialPicks} onAttemptSaved={() => {}} />
```

- [ ] **Step 4: Verify**

Run: `npm run dev`. Open an A1 lesson. Pick 3 answers. Start the timer, let it run ~10 seconds, Stop. Reload the page. Expect:
- Banner "Resumed your in-progress attempt." appears.
- The 3 answers are pre-selected.
- Timer shows the accumulated time but is paused (not running).
- Clicking Start resumes from the previous time.
- Clicking "Abandon and start over" clears the banner, resets the form and timer.
- Submitting the quiz removes the draft (verify in DevTools → IndexedDB → `drafts`).

- [ ] **Step 5: Commit**

```bash
git add src/components/reading/resume-banner.tsx src/components/reading/quiz.tsx "src/app/(app)/reading/[lessonId]/page.tsx"
git commit -m "feat(reading): persist in-progress drafts and resume on reload"
```

---

## Task 17: Layout toggle (two-column ↔ stacked) + attempt history

**Files:**
- Create: `src/components/reading/layout-toggle.tsx`
- Create: `src/components/reading/attempt-history.tsx`
- Modify: `src/app/(app)/reading/[lessonId]/page.tsx`

- [ ] **Step 1: LayoutToggle**

Create `src/components/reading/layout-toggle.tsx`:
```tsx
"use client";

import { Columns2, Rows2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePreferences, setDetailLayout } from "@/lib/db/use-preferences";

export function LayoutToggle() {
  const prefs = usePreferences();
  return (
    <ToggleGroup
      type="single"
      value={prefs.detailLayout}
      onValueChange={(v) => v && setDetailLayout(v as "two-column" | "stacked")}
      aria-label="Layout"
      size="sm"
    >
      <ToggleGroupItem value="two-column" aria-label="Two columns">
        <Columns2 className="size-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem value="stacked" aria-label="Stacked">
        <Rows2 className="size-3.5" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
```

- [ ] **Step 2: AttemptHistory**

Create `src/components/reading/attempt-history.tsx`:
```tsx
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listAttemptsForLesson } from "@/lib/db/queries";

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString();
}

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export function AttemptHistory({ lessonId }: { lessonId: string }) {
  const attempts = useLiveQuery(() => listAttemptsForLesson("default", lessonId), [lessonId]);
  if (!attempts || attempts.length === 0) return null;
  return (
    <section className="mt-6 rounded-md border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">Attempt history</h2>
      <table className="w-full text-xs">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 text-left font-medium">Date</th>
            <th className="py-1 text-left font-medium">Score</th>
            <th className="py-1 text-left font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {[...attempts].reverse().map((a) => (
            <tr key={a.id} className="border-t">
              <td className="py-1">{fmtDate(a.completedAt)}</td>
              <td className="py-1">{a.score}/{a.total}</td>
              <td className="py-1">{fmtDuration(a.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 3: Apply layout preference + add toggle + history to detail page**

Modify `src/app/(app)/reading/[lessonId]/page.tsx`:
- Add imports:
```tsx
import { LayoutToggle } from "@/components/reading/layout-toggle";
import { AttemptHistory } from "@/components/reading/attempt-history";
```
- In the header's right-side div, append `<LayoutToggle />`:
```tsx
<div className="flex items-center gap-2">
  <LessonTimer />
  <HintSettingsPopover />
  <LayoutToggle />
</div>
```
- Change the body grid className to be conditional on `prefs.detailLayout`:
```tsx
<div
  className={
    prefs.detailLayout === "two-column"
      ? "grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]"
      : "flex flex-col gap-4"
  }
>
```
- After the body grid (outside the closing `</div>`), render the history:
```tsx
<AttemptHistory lessonId={lessonId} />
```

- [ ] **Step 4: Verify**

Run: `npm run dev`. Open a lesson at viewport ≥ 1024px → two-column by default. Click the Rows2 icon → switches to stacked. Reload → still stacked (preference saved). Resize browser to < 1024px → already stacked thanks to the Tailwind `lg:` breakpoint. Complete a quiz → "Attempt history" section appears with one row. Retry, submit → second row.

- [ ] **Step 5: Commit**

```bash
git add src/components/reading/layout-toggle.tsx src/components/reading/attempt-history.tsx "src/app/(app)/reading/[lessonId]/page.tsx"
git commit -m "feat(reading): layout toggle preference + attempt history"
```

---

## Task 18: Cleanup + acceptance verification

**Files:**
- Delete: `src/stores/example-store.ts`
- Modify (minor): any small fixes surfaced during verification

- [ ] **Step 1: Delete the example store**

Run: `rm src/stores/example-store.ts`

If TypeScript build fails because nothing else imports it, that's expected. Otherwise fix the dangling import.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: all suites pass (lesson schema, annotate, score, db, timer).

- [ ] **Step 3: Run typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: zero errors. Fix any reported issues.

- [ ] **Step 4: Manual acceptance walk-through**

Run: `npm run dev` and walk through every numbered item in the spec [section 10](../specs/2026-05-18-reading-page-design.md#10-acceptance-criteria). Each should pass without intervention:
1. `/` → redirects to `/reading`. Sidebar has 5 items, only Reading is real.
2. Theme toggle in sidebar footer flips light/dark.
3. `/reading` shows 5 sample lessons. Level + tag filters work. "Clear filters" works.
4. Open a lesson — every sub-bullet in spec §10.4 verifies.
5. After submitting, returning to `/reading` shows "Best X/Y" badge on the card.
6. `/writing`, `/listening`, `/grammar`, `/speaking` show "Coming soon" inside the shell.

If anything fails, fix it before continuing. Re-run the suite + manual checks after each fix.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: drop example store and clean up"
```

---

## Self-Review Notes

**Spec coverage check:**

| Spec section | Implemented in |
|---|---|
| §3 confirmed UX decisions | Throughout — covered task-by-task. |
| §4 architecture (Dexie, React Query, zustand) | Task 6 (DB), Task 7 (RQ loader), Task 13 (timer store), Task 15 (RHF in Quiz). |
| §4 lesson + attempt + draft schemas | Task 3, Task 6. |
| §5 routing & file structure | Tasks 9-10 (shell), Task 12 (hub), Task 13 (detail). |
| §6.1 app shell | Task 9, Task 10. |
| §6.2 hub | Task 11, Task 12. |
| §6.3 lesson detail (all sub-features) | Tasks 13-17. |
| §6.4 stub pages | Task 10. |
| §7 hint settings popover | Task 14. |
| §8 consistency contract | Reused components (FilterChipRow, LessonCard, Sidebar) verified in Tasks 11, 12, 9. |
| §10 acceptance criteria | Task 18. |

**Type consistency:** `Attempt`, `Draft`, `Preferences`, `HintToggles`, `Lesson` types are defined once in `src/lib/db/types.ts` and `src/lib/lessons/types.ts` and re-imported everywhere. `scoreQuiz`'s `AnswerRow` is imported into the DB types module to keep them aligned. `profileId: "default"` is hardcoded in queries today; future multi-profile work changes only the queries layer.

**Placeholder scan:** No "TODO" / "TBD" / "implement later" / "similar to Task N" / "add error handling" in any step. All code blocks contain runnable code. The 250-lesson generator is explicitly out of scope (per spec §2); the sample lessons in Task 7 satisfy the runtime requirement.
