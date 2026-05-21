# Writing Lesson Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Writing skill that mirrors Reading's hub + lesson-detail UX, including hand-authored lesson JSON, a multiple-choice quiz, a free-write exercise, and AI feedback delivered via a Vercel + Firebase Firestore relay that the client subscribes to in real time.

**Architecture:** Reuse the existing client-side Next.js + Dexie app and its Reading components/primitives. Add a parallel writing lesson schema (zod + types + loader hook), a parallel Dexie table pair (`writingDrafts`, `writingAttempts`) introduced in DB version 5, a new `/writing` hub and `/writing/[lessonId]` detail page, and a Firebase-backed relay (two Next.js Route Handlers + a Firestore `writingSessions` collection) so an external LLM can POST feedback that the client renders the moment it lands.

**Tech Stack:** Next.js 16 App Router (existing), React 19, Tailwind v4, Dexie 4 (IndexedDB), `@tanstack/react-query` 5, zod 4, sonner, lucide-react, Firebase JS SDK 11 + firebase-admin 13 (new), Vitest 4 + Testing Library (existing), jsdom + fake-indexeddb (existing).

**Spec:** `docs/superpowers/specs/2026-05-21-writing-lesson-design.md`.

---

## File structure

### New files

```
public/lessons/writing/index.json
public/lessons/writing/a1/writing-a1-001.json

src/lib/firebase/client.ts          # client SDK init, exports `db`
src/lib/firebase/admin.ts           # admin SDK init (server only)

src/lib/writing/result-schema.ts    # zod schema for WritingLLMResult (shared)
src/lib/writing/result-schema.test.ts
src/lib/writing/prompt.ts           # buildLLMPrompt(lesson, userText, callbackUrl)
src/lib/writing/prompt.test.ts

src/lib/db/use-writing-drafts.ts
src/lib/db/use-best-writing-attempts.ts

src/app/api/writing/session/route.ts
src/app/api/writing/result/[token]/route.ts

src/components/writing/writing-session.tsx      # context + state + relay subscription
src/components/writing/writing-prompt-card.tsx
src/components/writing/hint-panel.tsx
src/components/writing/writing-editor.tsx
src/components/writing/sample-answer-reveal.tsx
src/components/writing/prompt-copy-panel.tsx
src/components/writing/writing-result-waiting.tsx
src/components/writing/writing-result-panel.tsx
src/components/writing/writing-attempt-history.tsx

src/app/(app)/writing/[lessonId]/page.tsx       # replaces ComingSoon
```

### Modified files

```
src/lib/lessons/types.ts                # add WritingLesson, WritingLessonMeta
src/lib/lessons/schema.ts               # add writingLessonSchema + index
src/lib/lessons/load.ts                 # extend parseKindAndLevel + add hooks
src/lib/db/types.ts                     # add WritingDraft, WritingAttempt
src/lib/db/client.ts                    # add DB version 5 (writingDrafts, writingAttempts)
src/lib/db/queries.ts                   # add writing draft/attempt queries
src/components/reading/quiz-section.tsx # export QuizContextValue type for reuse hint
src/components/reading/mc-questions.tsx # accept optional explicit picks via prop OR keep using context (see Task 11)
src/app/(app)/writing/page.tsx          # replace ComingSoon with hub
src/components/app-shell/nav-config.ts  # flip writing comingSoon to false
.env.example                            # document Firebase env vars
package.json                            # add firebase + firebase-admin
```

---

## Task 1: Add Writing lesson TypeScript types

**Files:**
- Modify: `src/lib/lessons/types.ts`

- [ ] **Step 1: Add WritingLesson + WritingLessonMeta to types**

In `src/lib/lessons/types.ts`, append at the bottom of the file (after the listening types):

```ts
export type WritingLesson = {
  id: string;
  level: CefrLevel;
  title: string;
  summary: string;
  tags: string[];
  topic: string;
  prompt: string;
  minWords?: number;
  maxWords?: number;
  hintStarters: string[];
  hintVocab: Annotation[];
  sampleText: string;
  sampleAnnotations: Annotation[];
  sampleGrammarNotes: GrammarNote[];
  sampleTranslationVi: string;
  mcQuestions: Question[];
  criticalThinkingQuestion?: string;
};

export type WritingLessonMeta = {
  id: string;
  level: CefrLevel;
  title: string;
  summary: string;
  tags: string[];
  topic: string;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/lib/lessons/types.ts
git commit -m "feat(writing): add WritingLesson types"
```

---

## Task 2: Add zod schemas for Writing lessons

**Files:**
- Modify: `src/lib/lessons/schema.ts`
- Test: `src/lib/lessons/writing-schema.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/lib/lessons/writing-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { writingLessonSchema, writingLessonsIndexSchema } from "./schema";

const validLesson = {
  id: "writing-a1-001",
  level: "A1" as const,
  title: "My favorite weekend",
  summary: "Write about what you do on weekends.",
  tags: ["Daily life"],
  topic: "My favorite weekend",
  prompt: "Write 5–7 sentences about what you usually do on weekends.",
  minWords: 40,
  maxWords: 120,
  hintStarters: ["On weekends, I usually…", "My favorite thing is…"],
  hintVocab: [
    { phrase: "relax", meaningVi: "thư giãn" },
    { phrase: "weekend", meaningVi: "cuối tuần", pronunciation: "/ˈwiːkend/" },
  ],
  sampleText: "On weekends, I usually relax at home...",
  sampleAnnotations: [{ phrase: "relax", meaningVi: "thư giãn" }],
  sampleGrammarNotes: [
    { title: "Present simple", bodyVi: "Dùng hiện tại đơn cho thói quen.", bodyEn: "Use present simple for habits." },
  ],
  sampleTranslationVi: "Vào cuối tuần, tôi thường thư giãn ở nhà...",
  mcQuestions: [
    {
      id: "q1",
      prompt: "Which sentence best describes a weekend habit?",
      options: ["I went home.", "I usually relax at home.", "Relax I home.", "I home relax."],
      answerIndex: 1,
      explanation: "Present simple + adverb of frequency.",
      hint: "Look for the adverb 'usually'.",
    },
  ],
};

describe("writingLessonSchema", () => {
  it("parses a valid writing lesson", () => {
    expect(() => writingLessonSchema.parse(validLesson)).not.toThrow();
  });

  it("rejects an empty title", () => {
    expect(() =>
      writingLessonSchema.parse({ ...validLesson, title: "" }),
    ).toThrow();
  });

  it("requires at least one mcQuestion", () => {
    expect(() =>
      writingLessonSchema.parse({ ...validLesson, mcQuestions: [] }),
    ).toThrow();
  });
});

describe("writingLessonsIndexSchema", () => {
  it("parses an array of metas", () => {
    const meta = {
      id: "writing-a1-001",
      level: "A1" as const,
      title: "My favorite weekend",
      summary: "Write about what you do on weekends.",
      tags: ["Daily life"],
      topic: "My favorite weekend",
    };
    expect(() => writingLessonsIndexSchema.parse([meta])).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/lib/lessons/writing-schema.test.ts`
Expected: FAIL — `writingLessonSchema is not exported`.

- [ ] **Step 3: Add the schemas**

In `src/lib/lessons/schema.ts`, append at the end:

```ts
export const writingLessonSchema = z.object({
  id: z.string().min(1),
  level: cefrLevel,
  title: z.string().min(1),
  summary: z.string(),
  tags: z.array(z.string()),
  topic: z.string().min(1),
  prompt: z.string().min(1),
  minWords: z.number().int().positive().optional(),
  maxWords: z.number().int().positive().optional(),
  hintStarters: z.array(z.string().min(1)),
  hintVocab: z.array(annotation),
  sampleText: z.string().min(1),
  sampleAnnotations: z.array(annotation),
  sampleGrammarNotes: z.array(grammarNote),
  sampleTranslationVi: z.string(),
  mcQuestions: z.array(question).min(1),
  criticalThinkingQuestion: z.string().optional(),
});

export const writingLessonMetaSchema = z.object({
  id: z.string().min(1),
  level: cefrLevel,
  title: z.string().min(1),
  summary: z.string(),
  tags: z.array(z.string()),
  topic: z.string().min(1),
});

export const writingLessonsIndexSchema = z.array(writingLessonMetaSchema);
```

- [ ] **Step 4: Re-run the test**

Run: `npx vitest run src/lib/lessons/writing-schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/lessons/schema.ts src/lib/lessons/writing-schema.test.ts
git commit -m "feat(writing): add zod schemas for writing lessons"
```

---

## Task 3: Extend the lesson loader to support Writing

**Files:**
- Modify: `src/lib/lessons/load.ts`

- [ ] **Step 1: Extend `parseKindAndLevel` and add fetch + hooks**

Replace the contents of `src/lib/lessons/load.ts` so the file is:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import {
  lessonSchema,
  lessonsIndexSchema,
  listeningLessonSchema,
  listeningLessonsIndexSchema,
  writingLessonSchema,
  writingLessonsIndexSchema,
} from "./schema";
import type {
  CefrLevel,
  Lesson,
  LessonMeta,
  ListeningLesson,
  ListeningLessonMeta,
  WritingLesson,
  WritingLessonMeta,
} from "./types";

type LessonKind = "reading" | "listening" | "writing";

function parseKindAndLevel(lessonId: string): { kind: LessonKind; level: CefrLevel } {
  const match = lessonId.match(/^(reading|listening|writing)-(a1|a2|b1|b2|c1)-/i);
  if (!match) throw new Error(`Cannot derive kind/level from lesson id: ${lessonId}`);
  return {
    kind: match[1].toLowerCase() as LessonKind,
    level: match[2].toUpperCase() as CefrLevel,
  };
}

async function fetchReadingIndex(): Promise<LessonMeta[]> {
  const res = await fetch("/lessons/reading/index.json");
  if (!res.ok) throw new Error("Failed to load reading lessons index");
  return lessonsIndexSchema.parse(await res.json());
}

async function fetchReadingLesson(lessonId: string): Promise<Lesson> {
  const { level } = parseKindAndLevel(lessonId);
  const res = await fetch(`/lessons/reading/${level.toLowerCase()}/${lessonId}.json`);
  if (!res.ok) throw new Error(`Failed to load lesson ${lessonId}`);
  return lessonSchema.parse(await res.json());
}

async function fetchListeningIndex(): Promise<ListeningLessonMeta[]> {
  const res = await fetch("/lessons/listening/index.json");
  if (!res.ok) throw new Error("Failed to load listening lessons index");
  return listeningLessonsIndexSchema.parse(await res.json());
}

async function fetchListeningLesson(lessonId: string): Promise<ListeningLesson> {
  const { level } = parseKindAndLevel(lessonId);
  const res = await fetch(`/lessons/listening/${level.toLowerCase()}/${lessonId}.json`);
  if (!res.ok) throw new Error(`Failed to load lesson ${lessonId}`);
  return listeningLessonSchema.parse(await res.json());
}

async function fetchWritingIndex(): Promise<WritingLessonMeta[]> {
  const res = await fetch("/lessons/writing/index.json");
  if (!res.ok) throw new Error("Failed to load writing lessons index");
  return writingLessonsIndexSchema.parse(await res.json());
}

async function fetchWritingLesson(lessonId: string): Promise<WritingLesson> {
  const { level } = parseKindAndLevel(lessonId);
  const res = await fetch(`/lessons/writing/${level.toLowerCase()}/${lessonId}.json`);
  if (!res.ok) throw new Error(`Failed to load lesson ${lessonId}`);
  return writingLessonSchema.parse(await res.json());
}

export function useReadingLessonsIndex() {
  return useQuery({
    queryKey: ["lessons", "reading", "index"],
    queryFn: fetchReadingIndex,
    staleTime: Infinity,
  });
}

export function useReadingLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", "reading", "lesson", lessonId],
    queryFn: () => fetchReadingLesson(lessonId as string),
    staleTime: Infinity,
    enabled: Boolean(lessonId),
  });
}

export function useListeningLessonsIndex() {
  return useQuery({
    queryKey: ["lessons", "listening", "index"],
    queryFn: fetchListeningIndex,
    staleTime: Infinity,
  });
}

export function useListeningLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", "listening", "lesson", lessonId],
    queryFn: () => fetchListeningLesson(lessonId as string),
    staleTime: Infinity,
    enabled: Boolean(lessonId),
  });
}

export function useWritingLessonsIndex() {
  return useQuery({
    queryKey: ["lessons", "writing", "index"],
    queryFn: fetchWritingIndex,
    staleTime: Infinity,
  });
}

export function useWritingLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", "writing", "lesson", lessonId],
    queryFn: () => fetchWritingLesson(lessonId as string),
    staleTime: Infinity,
    enabled: Boolean(lessonId),
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/lessons/load.ts
git commit -m "feat(writing): add writing lesson loader hooks"
```

---

## Task 4: Author the first Writing lesson + index

**Files:**
- Create: `public/lessons/writing/index.json`
- Create: `public/lessons/writing/a1/writing-a1-001.json`

- [ ] **Step 1: Write the lesson JSON**

Create `public/lessons/writing/a1/writing-a1-001.json` with:

```json
{
  "id": "writing-a1-001",
  "level": "A1",
  "title": "My favorite weekend",
  "summary": "Write about what you usually do on weekends.",
  "tags": ["Daily life", "Routine"],
  "topic": "My favorite weekend",
  "prompt": "Write 5–7 short sentences about what you usually do on weekends. Use present simple and adverbs of frequency (always, usually, sometimes).",
  "minWords": 40,
  "maxWords": 120,
  "hintStarters": [
    "On weekends, I usually…",
    "My favorite thing on weekends is…",
    "Sometimes I…",
    "After breakfast, I…"
  ],
  "hintVocab": [
    { "phrase": "relax", "meaningVi": "thư giãn" },
    { "phrase": "usually", "meaningVi": "thường", "pronunciation": "/ˈjuːʒuəli/" },
    { "phrase": "weekend", "meaningVi": "cuối tuần", "pronunciation": "/ˈwiːkend/" },
    { "phrase": "go for a walk", "meaningVi": "đi dạo" },
    { "phrase": "spend time with", "meaningVi": "dành thời gian với" }
  ],
  "sampleText": "On weekends, I usually wake up late. After breakfast, I go for a walk in the park near my house. Sometimes I meet my friends and we have coffee together. In the afternoon, I read a book or watch a movie at home. I always call my parents on Sunday evening. I love weekends because I can relax and spend time with the people I love.",
  "sampleAnnotations": [
    { "phrase": "wake up", "meaningVi": "thức dậy" },
    { "phrase": "go for a walk", "meaningVi": "đi dạo" },
    { "phrase": "spend time with", "meaningVi": "dành thời gian với" }
  ],
  "sampleGrammarNotes": [
    {
      "title": "Present simple for habits",
      "bodyVi": "Dùng thì hiện tại đơn (wake up, go, meet, read, call) cho các thói quen lặp lại.",
      "bodyEn": "Use the present simple (wake up, go, meet, read, call) for repeated habits."
    },
    {
      "title": "Adverbs of frequency",
      "bodyVi": "'usually', 'sometimes', 'always' đặt trước động từ chính.",
      "bodyEn": "'usually', 'sometimes', 'always' go before the main verb."
    }
  ],
  "sampleTranslationVi": "Vào cuối tuần, tôi thường thức dậy muộn. Sau bữa sáng, tôi đi dạo trong công viên gần nhà. Thỉnh thoảng tôi gặp bạn bè và chúng tôi đi uống cà phê cùng nhau. Buổi chiều, tôi đọc sách hoặc xem phim ở nhà. Tôi luôn gọi điện cho bố mẹ vào tối Chủ nhật. Tôi yêu cuối tuần vì tôi có thể thư giãn và dành thời gian với những người tôi yêu thương.",
  "mcQuestions": [
    {
      "id": "q1",
      "prompt": "Which sentence best describes a regular weekend habit?",
      "options": [
        "I went to the park yesterday.",
        "I usually go to the park on weekends.",
        "Park I going usually.",
        "I will go to park."
      ],
      "answerIndex": 1,
      "explanation": "Present simple + 'usually' expresses a habit.",
      "hint": "Look for a present-tense verb with an adverb of frequency."
    },
    {
      "id": "q2",
      "prompt": "Which sentence sounds most natural for a weekend description?",
      "options": [
        "On weekend I sleeping late always.",
        "I am sleep late on weekends.",
        "On weekends, I always sleep late.",
        "Always I sleep late weekends."
      ],
      "answerIndex": 2,
      "explanation": "Time phrase first, then subject + adverb + verb.",
      "hint": "Time phrase usually comes first; the adverb goes before the verb."
    },
    {
      "id": "q3",
      "prompt": "Choose the sentence with the best vocabulary for relaxing on weekends.",
      "options": [
        "I do nothing always.",
        "I sit and don't move.",
        "I relax at home with my family.",
        "I do my homework all day."
      ],
      "answerIndex": 2,
      "explanation": "'relax' is the natural word; 'at home with my family' is on-topic.",
      "hint": "Pick the sentence with both 'relax' and a weekend-friendly activity."
    }
  ],
  "criticalThinkingQuestion": "Which weekend habit do you think helps you most for the week ahead, and why?"
}
```

- [ ] **Step 2: Write the index**

Create `public/lessons/writing/index.json`:

```json
[
  {
    "id": "writing-a1-001",
    "level": "A1",
    "title": "My favorite weekend",
    "summary": "Write about what you usually do on weekends.",
    "tags": ["Daily life", "Routine"],
    "topic": "My favorite weekend"
  }
]
```

- [ ] **Step 3: Validate the JSON against the schema (smoke test)**

Run: `node -e "const z = require('./src/lib/lessons/schema'); require('fs');"` — instead, run a quick vitest validation:

Create a temporary test `src/lib/lessons/writing-fixture.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { writingLessonSchema, writingLessonsIndexSchema } from "./schema";

describe("writing fixture", () => {
  it("validates writing-a1-001 against the schema", () => {
    const raw = readFileSync(
      resolve(process.cwd(), "public/lessons/writing/a1/writing-a1-001.json"),
      "utf-8",
    );
    expect(() => writingLessonSchema.parse(JSON.parse(raw))).not.toThrow();
  });

  it("validates the writing index", () => {
    const raw = readFileSync(
      resolve(process.cwd(), "public/lessons/writing/index.json"),
      "utf-8",
    );
    expect(() => writingLessonsIndexSchema.parse(JSON.parse(raw))).not.toThrow();
  });
});
```

Run: `npx vitest run src/lib/lessons/writing-fixture.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add public/lessons/writing src/lib/lessons/writing-fixture.test.ts
git commit -m "feat(writing): add first A1 writing lesson + index"
```

---

## Task 5: Add Dexie types for writing drafts and attempts

**Files:**
- Modify: `src/lib/db/types.ts`

- [ ] **Step 1: Append the new types**

At the bottom of `src/lib/db/types.ts`, add:

```ts
export type WritingLLMResult = {
  scores: {
    task: number;
    grammar: number;
    vocabulary: number;
    coherence: number;
    overall: number;
  };
  corrections: { original: string; fixed: string; explanation: string }[];
  suggestions: string[];
  rewritten: string;
  model?: string;
};

export type WritingDraft = {
  profileId: string;
  lessonId: string;
  text: string;
  mcPicks: Record<string, number>;
  sessionToken: string | null;
  sampleRevealed: boolean;
  updatedAt: number;
  durationMs: number;
};

export type WritingAttempt = {
  id: string;
  profileId: string;
  lessonId: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  text: string;
  mcScore: number;
  mcTotal: number;
  mcPicks: Record<string, number>;
  llmResult: WritingLLMResult | null;
  sampleRevealed: boolean;
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/types.ts
git commit -m "feat(writing): add WritingDraft, WritingAttempt, WritingLLMResult types"
```

---

## Task 6: Add Dexie tables in DB version 5

**Files:**
- Modify: `src/lib/db/client.ts`
- Test: `src/lib/db/writing-db.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/lib/db/writing-db.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "./client";
import type { WritingAttempt, WritingDraft } from "./types";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("writing tables (DB v5)", () => {
  it("round-trips a writing draft", async () => {
    const draft: WritingDraft = {
      profileId: "default",
      lessonId: "writing-a1-001",
      text: "I usually relax.",
      mcPicks: { q1: 1 },
      sessionToken: null,
      sampleRevealed: false,
      updatedAt: Date.now(),
      durationMs: 12_000,
    };
    await db.writingDrafts.put(draft);
    const loaded = await db.writingDrafts.get(["default", "writing-a1-001"]);
    expect(loaded?.text).toBe("I usually relax.");
  });

  it("lists writing attempts by [profileId+lessonId]", async () => {
    const attempt: WritingAttempt = {
      id: "att-1",
      profileId: "default",
      lessonId: "writing-a1-001",
      startedAt: 0,
      completedAt: 1,
      durationMs: 1,
      text: "Hello.",
      mcScore: 0,
      mcTotal: 0,
      mcPicks: {},
      llmResult: null,
      sampleRevealed: false,
    };
    await db.writingAttempts.put(attempt);
    const rows = await db.writingAttempts
      .where("[profileId+lessonId]")
      .equals(["default", "writing-a1-001"])
      .toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("att-1");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/lib/db/writing-db.test.ts`
Expected: FAIL — `db.writingDrafts` is undefined.

- [ ] **Step 3: Add the v5 version block**

In `src/lib/db/client.ts`:

a) Add imports at the top of the file (after the existing imports):

```ts
import type { WritingDraft, WritingAttempt } from "./types";
```

b) Add fields on the class (after `notes!: Table<...>`):

```ts
  writingDrafts!: Table<WritingDraft, [string, string]>;
  writingAttempts!: Table<WritingAttempt, string>;
```

c) In the constructor, after the existing `this.version(4)...` block, append:

```ts
    // v5: additive — two new tables for writing drafts and writing attempts.
    // Bookmarks/notes are reused across reading + writing (lessonId-keyed).
    this.version(5).stores({
      profiles: "id",
      preferences: "profileId",
      attempts: "id, [profileId+lessonId], completedAt",
      drafts: "[profileId+lessonId]",
      bookmarks: "[profileId+lessonId], profileId",
      vocab:
        "id, [profileId+phraseLower], [profileId+sourceLessonId], [profileId+addedAt]",
      notes: "[profileId+lessonId]",
      writingDrafts: "[profileId+lessonId]",
      writingAttempts: "id, [profileId+lessonId], completedAt",
    });
```

- [ ] **Step 4: Re-run the test**

Run: `npx vitest run src/lib/db/writing-db.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the existing DB test suite to confirm no regression**

Run: `npx vitest run src/lib/db/db.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/client.ts src/lib/db/writing-db.test.ts
git commit -m "feat(writing): add Dexie writingDrafts + writingAttempts tables (DB v5)"
```

---

## Task 7: Add writing draft + attempt queries

**Files:**
- Modify: `src/lib/db/queries.ts`
- Test: `src/lib/db/writing-queries.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/lib/db/writing-queries.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "./client";
import {
  bestWritingAttemptByLesson,
  deleteWritingDraft,
  getWritingDraft,
  listWritingAttemptsForLesson,
  resetWritingProgress,
  saveWritingAttempt,
  upsertWritingDraft,
} from "./queries";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("writing queries", () => {
  it("upserts and reads a writing draft", async () => {
    await upsertWritingDraft({
      profileId: "default",
      lessonId: "writing-a1-001",
      text: "hi",
      mcPicks: {},
      sessionToken: null,
      sampleRevealed: false,
      updatedAt: 1,
      durationMs: 0,
    });
    const d = await getWritingDraft("default", "writing-a1-001");
    expect(d?.text).toBe("hi");
  });

  it("deletes a writing draft", async () => {
    await upsertWritingDraft({
      profileId: "default",
      lessonId: "writing-a1-001",
      text: "hi",
      mcPicks: {},
      sessionToken: null,
      sampleRevealed: false,
      updatedAt: 1,
      durationMs: 0,
    });
    await deleteWritingDraft("default", "writing-a1-001");
    expect(await getWritingDraft("default", "writing-a1-001")).toBeUndefined();
  });

  it("lists and bests writing attempts by overall score", async () => {
    const base = {
      profileId: "default",
      lessonId: "writing-a1-001",
      startedAt: 0,
      completedAt: 1,
      durationMs: 0,
      text: "t",
      mcScore: 0,
      mcTotal: 0,
      mcPicks: {},
      sampleRevealed: false,
    };
    await saveWritingAttempt({
      ...base,
      id: "a",
      llmResult: { scores: { task: 5, grammar: 5, vocabulary: 5, coherence: 5, overall: 5 }, corrections: [], suggestions: [], rewritten: "" },
    });
    await saveWritingAttempt({
      ...base,
      id: "b",
      llmResult: { scores: { task: 7, grammar: 7, vocabulary: 7, coherence: 7, overall: 7 }, corrections: [], suggestions: [], rewritten: "" },
    });
    const rows = await listWritingAttemptsForLesson("default", "writing-a1-001");
    expect(rows).toHaveLength(2);
    const best = await bestWritingAttemptByLesson("default");
    expect(best.get("writing-a1-001")?.id).toBe("b");
  });

  it("resets writing progress", async () => {
    await upsertWritingDraft({
      profileId: "default",
      lessonId: "writing-a1-001",
      text: "hi",
      mcPicks: {},
      sessionToken: null,
      sampleRevealed: false,
      updatedAt: 1,
      durationMs: 0,
    });
    await saveWritingAttempt({
      id: "a",
      profileId: "default",
      lessonId: "writing-a1-001",
      startedAt: 0,
      completedAt: 1,
      durationMs: 0,
      text: "t",
      mcScore: 0,
      mcTotal: 0,
      mcPicks: {},
      llmResult: null,
      sampleRevealed: false,
    });
    await resetWritingProgress("default", "writing-a1-001");
    expect(await getWritingDraft("default", "writing-a1-001")).toBeUndefined();
    expect(await listWritingAttemptsForLesson("default", "writing-a1-001")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Confirm it fails**

Run: `npx vitest run src/lib/db/writing-queries.test.ts`
Expected: FAIL — `upsertWritingDraft is not exported`.

- [ ] **Step 3: Add the queries**

At the bottom of `src/lib/db/queries.ts`, append the queries. Also extend the existing top-of-file `import type { ... } from "./types"` block to include `WritingAttempt` and `WritingDraft` alongside the existing imports.

```ts
// ─── Writing drafts & attempts ────────────────────────────────────────────────

export async function upsertWritingDraft(draft: WritingDraft): Promise<void> {
  await db.writingDrafts.put(draft);
}

export async function getWritingDraft(
  profileId: string,
  lessonId: string,
): Promise<WritingDraft | undefined> {
  return db.writingDrafts.get([profileId, lessonId]);
}

export async function deleteWritingDraft(
  profileId: string,
  lessonId: string,
): Promise<void> {
  await db.writingDrafts.delete([profileId, lessonId]);
}

export async function saveWritingAttempt(attempt: WritingAttempt): Promise<void> {
  await db.writingAttempts.put(attempt);
}

export async function listWritingAttemptsForLesson(
  profileId: string,
  lessonId: string,
): Promise<WritingAttempt[]> {
  return db.writingAttempts
    .where("[profileId+lessonId]")
    .equals([profileId, lessonId])
    .sortBy("completedAt");
}

export async function bestWritingAttemptByLesson(
  profileId: string,
): Promise<Map<string, WritingAttempt>> {
  const all = await db.writingAttempts.where({ profileId }).toArray();
  const best = new Map<string, WritingAttempt>();
  for (const a of all) {
    const prev = best.get(a.lessonId);
    const prevOverall = prev?.llmResult?.scores.overall ?? -1;
    const curOverall = a.llmResult?.scores.overall ?? -1;
    if (!prev || curOverall > prevOverall) best.set(a.lessonId, a);
  }
  return best;
}

export async function resetWritingProgress(
  profileId: string,
  lessonId: string,
): Promise<void> {
  await db.transaction(
    "rw",
    db.writingAttempts,
    db.writingDrafts,
    async () => {
      const keys = await db.writingAttempts
        .where("[profileId+lessonId]")
        .equals([profileId, lessonId])
        .primaryKeys();
      if (keys.length > 0) {
        await db.writingAttempts.bulkDelete(keys as string[]);
      }
      await db.writingDrafts.delete([profileId, lessonId]);
    },
  );
}
```

- [ ] **Step 4: Re-run the test**

Run: `npx vitest run src/lib/db/writing-queries.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries.ts src/lib/db/writing-queries.test.ts
git commit -m "feat(writing): add writing draft + attempt queries"
```

---

## Task 8: Add `useWritingDrafts` + `useBestWritingAttempts` hooks

**Files:**
- Create: `src/lib/db/use-writing-drafts.ts`
- Create: `src/lib/db/use-best-writing-attempts.ts`

- [ ] **Step 1: Create the drafts hook**

`src/lib/db/use-writing-drafts.ts`:

```ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import { useActiveProfileId } from "./use-active-profile";

/** Returns a Set of lessonIds that have an in-progress writing draft. */
export function useWritingDrafts(): Set<string> | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    const rows = await db.writingDrafts.where({ profileId }).toArray();
    return new Set(rows.map((r) => r.lessonId));
  }, [profileId]);
}
```

- [ ] **Step 2: Create the best-attempts hook**

`src/lib/db/use-best-writing-attempts.ts`:

```ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import { useActiveProfileId } from "./use-active-profile";
import type { WritingAttempt } from "./types";

export function useBestWritingAttempts(): Map<string, WritingAttempt> | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    const all = await db.writingAttempts.where({ profileId }).toArray();
    const best = new Map<string, WritingAttempt>();
    for (const a of all) {
      const prev = best.get(a.lessonId);
      const prevOverall = prev?.llmResult?.scores.overall ?? -1;
      const curOverall = a.llmResult?.scores.overall ?? -1;
      if (!prev || curOverall > prevOverall) best.set(a.lessonId, a);
    }
    return best;
  }, [profileId]);
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/use-writing-drafts.ts src/lib/db/use-best-writing-attempts.ts
git commit -m "feat(writing): hooks for writing drafts + best attempts"
```

---

## Task 9: Add the LLM result zod schema

**Files:**
- Create: `src/lib/writing/result-schema.ts`
- Create: `src/lib/writing/result-schema.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/writing/result-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { writingLLMResultSchema } from "./result-schema";

const valid = {
  scores: { task: 8, grammar: 7, vocabulary: 7, coherence: 8, overall: 7.5 },
  corrections: [{ original: "I goes", fixed: "I go", explanation: "Subject-verb agreement." }],
  suggestions: ["Try varying sentence length."],
  rewritten: "I usually relax at home.",
  model: "gemini-2.5-pro",
};

describe("writingLLMResultSchema", () => {
  it("parses a valid result", () => {
    expect(() => writingLLMResultSchema.parse(valid)).not.toThrow();
  });

  it("clamps score range 0–10", () => {
    expect(() =>
      writingLLMResultSchema.parse({ ...valid, scores: { ...valid.scores, overall: 11 } }),
    ).toThrow();
    expect(() =>
      writingLLMResultSchema.parse({ ...valid, scores: { ...valid.scores, overall: -1 } }),
    ).toThrow();
  });

  it("allows empty corrections + suggestions", () => {
    expect(() =>
      writingLLMResultSchema.parse({ ...valid, corrections: [], suggestions: [] }),
    ).not.toThrow();
  });

  it("requires rewritten to be a non-empty string", () => {
    expect(() =>
      writingLLMResultSchema.parse({ ...valid, rewritten: "" }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Confirm it fails**

Run: `npx vitest run src/lib/writing/result-schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/writing/result-schema.ts`:

```ts
import { z } from "zod";

const scoreField = z.number().min(0).max(10);

export const writingLLMResultSchema = z.object({
  scores: z.object({
    task: scoreField,
    grammar: scoreField,
    vocabulary: scoreField,
    coherence: scoreField,
    overall: scoreField,
  }),
  corrections: z.array(
    z.object({
      original: z.string(),
      fixed: z.string(),
      explanation: z.string(),
    }),
  ),
  suggestions: z.array(z.string()),
  rewritten: z.string().min(1),
  model: z.string().optional(),
});

export type WritingLLMResultParsed = z.infer<typeof writingLLMResultSchema>;
```

- [ ] **Step 4: Re-run the test**

Run: `npx vitest run src/lib/writing/result-schema.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/writing/result-schema.ts src/lib/writing/result-schema.test.ts
git commit -m "feat(writing): zod schema for LLM result payload"
```

---

## Task 10: Add the LLM prompt builder

**Files:**
- Create: `src/lib/writing/prompt.ts`
- Create: `src/lib/writing/prompt.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/writing/prompt.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildLLMPrompt, buildPasteBackPrompt } from "./prompt";

const lesson = {
  level: "A1" as const,
  topic: "My favorite weekend",
  prompt: "Write 5–7 sentences about weekends.",
};

describe("buildLLMPrompt", () => {
  it("embeds level, topic, task, user text, and callback URL", () => {
    const out = buildLLMPrompt({
      lesson,
      userText: "I relax on weekends.",
      callbackUrl: "https://x.app/api/writing/result/abc123",
    });
    expect(out).toContain("A1");
    expect(out).toContain("My favorite weekend");
    expect(out).toContain("Write 5–7 sentences about weekends.");
    expect(out).toContain("I relax on weekends.");
    expect(out).toContain("https://x.app/api/writing/result/abc123");
    expect(out).toContain("POST");
  });

  it("does not duplicate the user text", () => {
    const out = buildLLMPrompt({
      lesson,
      userText: "UNIQUE_MARKER_TEXT",
      callbackUrl: "https://x.app/api/writing/result/abc",
    });
    const matches = out.match(/UNIQUE_MARKER_TEXT/g) ?? [];
    expect(matches).toHaveLength(1);
  });
});

describe("buildPasteBackPrompt", () => {
  it("tells the LLM to print JSON instead of POSTing", () => {
    const out = buildPasteBackPrompt({
      lesson,
      userText: "I relax.",
    });
    expect(out.toLowerCase()).toContain("json");
    expect(out).not.toContain("POST");
  });
});
```

- [ ] **Step 2: Confirm it fails**

Run: `npx vitest run src/lib/writing/prompt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/writing/prompt.ts`:

```ts
import type { CefrLevel } from "@/lib/lessons/types";

type PromptInput = {
  lesson: { level: CefrLevel; topic: string; prompt: string };
  userText: string;
  callbackUrl: string;
};

const RESULT_SHAPE = `{
  "scores": { "task": 0-10, "grammar": 0-10, "vocabulary": 0-10, "coherence": 0-10, "overall": 0-10 },
  "corrections": [ { "original": "...", "fixed": "...", "explanation": "..." } ],
  "suggestions": ["..."],
  "rewritten": "A polished version of the learner's text at this CEFR level."
}`;

export function buildLLMPrompt({ lesson, userText, callbackUrl }: PromptInput): string {
  return `You are an English teacher giving feedback to a CEFR ${lesson.level} learner.

Topic: ${lesson.topic}
Task: ${lesson.prompt}

The learner's writing is between <text> tags below.

Please grade and respond by calling this HTTP endpoint exactly once:

POST ${callbackUrl}
Content-Type: application/json
Body (JSON):
${RESULT_SHAPE}

Be kind, specific, and concrete. Keep the rewritten version close to the learner's voice.

<text>
${userText}
</text>`;
}

export function buildPasteBackPrompt({
  lesson,
  userText,
}: {
  lesson: { level: CefrLevel; topic: string; prompt: string };
  userText: string;
}): string {
  return `You are an English teacher giving feedback to a CEFR ${lesson.level} learner.

Topic: ${lesson.topic}
Task: ${lesson.prompt}

Please grade and respond ONLY with a fenced \`\`\`json block matching this exact shape (the learner will paste it back into the app):
${RESULT_SHAPE}

Be kind, specific, and concrete. Keep the rewritten version close to the learner's voice.

<text>
${userText}
</text>`;
}
```

- [ ] **Step 4: Re-run the test**

Run: `npx vitest run src/lib/writing/prompt.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/writing/prompt.ts src/lib/writing/prompt.test.ts
git commit -m "feat(writing): LLM prompt + paste-back prompt builders"
```

---

## Task 11: Refactor `MCQuestions` to accept either context

**Files:**
- Modify: `src/components/reading/mc-questions.tsx`

The reading `MCQuestions` reads `lesson.questions`, `mcPicks`, `setMcPick`, and `reviewMode` from `useQuiz()`. Writing needs the same UI but driven by `WritingSession`. Solution: accept those four values as optional props; fall back to `useQuiz()` if not provided. This keeps every existing reading caller working unchanged.

- [ ] **Step 1: Modify `MCQuestions`**

Replace the body of `src/components/reading/mc-questions.tsx`:

```tsx
"use client";

import { QuizQuestion } from "./quiz-question";
import { useQuiz } from "./quiz-section";
import type { Question } from "@/lib/lessons/types";

type Props = {
  showHint: boolean;
  /** Optional override; falls back to QuizSection context if omitted. */
  questions?: Question[];
  picks?: Record<string, number>;
  onPick?: (id: string, index: number) => void;
  reviewMode?: boolean;
  /** Section label. Defaults to "Reading questions". */
  label?: string;
};

export function MCQuestions({
  showHint,
  questions,
  picks,
  onPick,
  reviewMode,
  label,
}: Props) {
  // When any explicit prop is provided, run in "controlled" mode without
  // reading the QuizSection context. This lets non-reading callers (writing)
  // use the same UI without providing a QuizSection.
  const controlled =
    questions !== undefined ||
    picks !== undefined ||
    onPick !== undefined ||
    reviewMode !== undefined;

  if (controlled) {
    if (!questions || !picks || !onPick) {
      throw new Error(
        "MCQuestions: when used in controlled mode, you must pass questions, picks, and onPick.",
      );
    }
    return (
      <div className="space-y-2 sm:space-y-3">
        <p className="text-sm font-semibold">
          {label ?? "Questions"} · {questions.length}
        </p>
        <div className="divide-y divide-border/60">
          {questions.map((q, i) => (
            <QuizQuestion
              key={q.id}
              index={i}
              question={q}
              value={picks[q.id]}
              onChange={(v) => onPick(q.id, v)}
              showHint={showHint}
              reviewMode={Boolean(reviewMode)}
            />
          ))}
        </div>
      </div>
    );
  }

  return <MCQuestionsFromContext showHint={showHint} label={label} />;
}

function MCQuestionsFromContext({
  showHint,
  label,
}: {
  showHint: boolean;
  label?: string;
}) {
  const { lesson, mcPicks, setMcPick, reviewMode } = useQuiz();
  return (
    <div className="space-y-2 sm:space-y-3">
      <p className="text-sm font-semibold">
        {label ?? "Reading questions"} · {lesson.questions.length}
      </p>
      <div className="divide-y divide-border/60">
        {lesson.questions.map((q, i) => (
          <QuizQuestion
            key={q.id}
            index={i}
            question={q}
            value={mcPicks[q.id]}
            onChange={(v) => setMcPick(q.id, v)}
            showHint={showHint}
            reviewMode={reviewMode}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Confirm Reading still works**

Run: `npx vitest run` (full suite)
Expected: PASS (all existing tests, including any that import `mc-questions`).

- [ ] **Step 3: Smoke-check the dev server visually**

Run (in another terminal): `npm run dev`
Open `http://localhost:4600/reading/reading-a1-001` and confirm the MC quiz still renders and is interactive. Stop the dev server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/components/reading/mc-questions.tsx
git commit -m "refactor(mc-questions): make controlled props optional for reuse"
```

---

## Task 12: Replace `/writing` placeholder with the hub page

**Files:**
- Modify: `src/app/(app)/writing/page.tsx`
- Modify: `src/components/app-shell/nav-config.ts`

- [ ] **Step 1: Flip the nav `comingSoon`**

In `src/components/app-shell/nav-config.ts`, change the writing line:

```ts
  { href: "/writing",   label: "Writing",   icon: PenLine },
```

(Remove `comingSoon: true`.)

- [ ] **Step 2: Replace the page with a hub clone of `/reading`**

Replace `src/app/(app)/writing/page.tsx` with the following. This is structurally a copy of `src/app/(app)/reading/page.tsx` adapted to writing — the only differences are (a) the data hook (`useWritingLessonsIndex`), (b) the "best attempt" hook (`useBestWritingAttempts`), (c) the "learning" set comes from `useWritingDrafts`, (d) the route prefix is `/writing`, (e) the sort-storage key is `writing:sortBy`. Reuse `LessonCard` — its link destination is derived in Task 13.

```tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWritingLessonsIndex } from "@/lib/lessons/load";
import { useBestWritingAttempts } from "@/lib/db/use-best-writing-attempts";
import { useBookmarks } from "@/lib/db/use-bookmarks";
import { useWritingDrafts } from "@/lib/db/use-writing-drafts";
import { FilterChipRow, type ChipOption } from "@/components/reading/filter-chip-row";
import { TagFilterRow } from "@/components/reading/tag-filter-row";
import { LessonCard } from "@/components/reading/lesson-card";
import { LessonSearch } from "@/components/reading/lesson-search";
import { SortSelect } from "@/components/reading/sort-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalStorageString } from "@/lib/use-local-storage";
import {
  buildFuse,
  searchWithHighlights,
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

const SORT_STORAGE_KEY = "writing:sortBy";

const STATUS_VALUES = ["learning", "learned"] as const;
type Status = (typeof STATUS_VALUES)[number];

function parseList(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function parseStatus(value: string | null): Status | null {
  return value && (STATUS_VALUES as readonly string[]).includes(value)
    ? (value as Status)
    : null;
}

function WritingHubContent() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedLevels = parseList(params.get("levels"));
  const selectedTags = parseList(params.get("tags"));
  const favoritesOnly = params.get("favorites") === "1";
  const status = parseStatus(params.get("status"));

  const { data: lessons, isLoading } = useWritingLessonsIndex();
  const bestByLesson = useBestWritingAttempts();
  const bookmarks = useBookmarks();
  const drafts = useWritingDrafts();

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRandomSeed(Math.floor(Math.random() * 0xffffffff));
  }, [levelsKey, tagsKey, favoritesOnly, status]);

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
      if (status === "learned" && !bestByLesson?.has(l.id)) return false;
      if (status === "learning" && !drafts?.has(l.id)) return false;
      return true;
    });
  }, [lessons, selectedLevels, selectedTags, favoritesOnly, bookmarks, status, bestByLesson, drafts]);

  const fuse = useMemo(() => buildFuse(filtered), [filtered]);
  const { items: searched, highlights } = useMemo(
    () => searchWithHighlights(filtered, query, fuse),
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
    router.replace(`/writing?${sp.toString()}`);
  }
  function toggleFavorites() {
    const sp = new URLSearchParams(params.toString());
    if (favoritesOnly) sp.delete("favorites");
    else sp.set("favorites", "1");
    router.replace(`/writing?${sp.toString()}`);
  }
  function setStatus(next: Status | null) {
    const sp = new URLSearchParams(params.toString());
    if (next === null) sp.delete("status");
    else sp.set("status", next);
    router.replace(`/writing?${sp.toString()}`);
  }
  function clearAllFilters() {
    setQuery("");
    router.replace("/writing");
  }

  const hasActiveFilters =
    selectedLevels.length > 0 ||
    selectedTags.length > 0 ||
    favoritesOnly ||
    status !== null ||
    isSearching;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pl-12 md:pl-0">
        <h1 className="text-lg font-semibold sm:text-xl">Writing lessons</h1>
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
        <button
          type="button"
          onClick={() => setStatus(status === "learning" ? null : "learning")}
          aria-pressed={status === "learning"}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            status === "learning"
              ? "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300"
              : "border-border text-muted-foreground hover:bg-accent",
          )}
        >
          Learning
        </button>
        <button
          type="button"
          onClick={() => setStatus(status === "learned" ? null : "learned")}
          aria-pressed={status === "learned"}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            status === "learned"
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "border-border text-muted-foreground hover:bg-accent",
          )}
        >
          Learned
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
              bestAttempt={undefined}
              highlight={highlights.get(lesson.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WritingHubPage() {
  return (
    <Suspense>
      <WritingHubContent />
    </Suspense>
  );
}
```

Note: `bestAttempt` is passed as `undefined` for now because the existing `LessonCard` expects the reading `Attempt` shape. Writing best-score chips are added in Task 13 when we update `LessonCard` to be route-aware.

- [ ] **Step 3: Smoke-test**

Run: `npm run dev`
Open `http://localhost:4600/writing`. Confirm: title "Writing lessons", search/filters render, the A1 lesson card shows. Click the card — it should navigate to `/reading/writing-a1-001` (broken) which we'll fix in Task 13.
Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/writing/page.tsx src/components/app-shell/nav-config.ts
git commit -m "feat(writing): hub page at /writing"
```

---

## Task 13: Make `LessonCard` route-aware and display best writing score

**Files:**
- Modify: `src/components/reading/lesson-card.tsx`

`LessonCard` currently hard-codes `/reading/${lesson.id}` and shows the reading `Attempt` `score/total`. We extend it minimally to:
1. Derive the route prefix from the lesson id (`reading-…` → `/reading`, `writing-…` → `/writing`, `listening-…` → `/listening`).
2. Accept an optional `bestLabel` prop so writing hub can pass `"Best 7.5/10"`.

- [ ] **Step 1: Modify `LessonCard`**

Replace the body of `src/components/reading/lesson-card.tsx`:

```tsx
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

function routeForLesson(id: string): string {
  if (id.startsWith("writing-")) return `/writing/${id}`;
  if (id.startsWith("listening-")) return `/listening/${id}`;
  return `/reading/${id}`;
}

export function LessonCard({
  lesson,
  bestAttempt,
  bestLabel,
  highlight,
}: {
  lesson: LessonMeta;
  bestAttempt?: Attempt;
  /** Optional explicit best-label override (used by /writing). */
  bestLabel?: string;
  highlight?: LessonHighlight;
}) {
  const orderedTags = orderTags(lesson.tags, highlight);
  const visibleTags = orderedTags.slice(0, 3);
  const overflow = orderedTags.length - visibleTags.length;

  const computedLabel =
    bestLabel ??
    (bestAttempt ? `Best ${bestAttempt.score}/${bestAttempt.total}` : null);

  return (
    <div className="group relative rounded-lg border bg-card text-card-foreground transition-shadow hover:shadow-md">
      <Link
        href={routeForLesson(lesson.id)}
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
          {computedLabel ? (
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-medium text-secondary-foreground">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              {computedLabel}
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

- [ ] **Step 2: Pass `bestLabel` from the writing hub**

In `src/app/(app)/writing/page.tsx`, replace the `LessonCard` render in the grid to compute a label from the writing best attempt:

```tsx
{display.map((lesson) => {
  const best = bestByLesson?.get(lesson.id);
  const overall = best?.llmResult?.scores.overall;
  const label =
    overall != null
      ? `Best ${overall.toFixed(1)}/10`
      : best
        ? "Attempted"
        : undefined;
  return (
    <LessonCard
      key={lesson.id}
      lesson={lesson}
      bestLabel={label}
      highlight={highlights.get(lesson.id)}
    />
  );
})}
```

- [ ] **Step 3: Smoke-test**

Run: `npm run dev`. Open `http://localhost:4600/writing`. The lesson card should link to `/writing/writing-a1-001`. That route is still 404 — fixed in the next task. Also open `http://localhost:4600/reading/reading-a1-001` to confirm reading routes still resolve.
Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/reading/lesson-card.tsx src/app/\(app\)/writing/page.tsx
git commit -m "feat(lesson-card): derive route from id + accept bestLabel override"
```

---

## Task 14: Add Firebase deps + env example + client/admin SDK init

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `src/lib/firebase/client.ts`
- Create: `src/lib/firebase/admin.ts`

- [ ] **Step 1: Install Firebase**

Run: `npm install firebase firebase-admin`
Expected: both packages added; no peer-dependency errors.

- [ ] **Step 2: Document env vars**

Create `.env.example`:

```
# Public Firebase config (browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Public app origin (used to build the relay callback URL on the server).
# Example: https://english-learning.example.com  (no trailing slash)
NEXT_PUBLIC_APP_ORIGIN=

# Server-only Firebase Admin SDK (Vercel server env)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
# Paste the full private key with embedded \n escapes
FIREBASE_PRIVATE_KEY=
```

- [ ] **Step 3: Create the client SDK init**

`src/lib/firebase/client.ts`:

```ts
"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

function getApp(): FirebaseApp {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }
  app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  return app;
}

export function getDb(): Firestore {
  if (firestore) return firestore;
  firestore = getFirestore(getApp());
  return firestore;
}
```

- [ ] **Step 4: Create the admin SDK init**

`src/lib/firebase/admin.ts`:

```ts
import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase admin env vars missing: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY",
    );
  }
  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return adminApp;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/firebase
git commit -m "feat(firebase): install SDK + add client/admin init modules"
```

---

## Task 15: Add the relay route handlers

**Files:**
- Create: `src/app/api/writing/session/route.ts`
- Create: `src/app/api/writing/result/[token]/route.ts`

The session endpoint creates a Firestore doc and returns the token + callback URL. The result endpoint validates the payload and writes to the same doc; it is callable from any origin.

- [ ] **Step 1: Create the session route**

`src/app/api/writing/session/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

const bodySchema = z.object({
  lessonId: z.string().min(1),
  profileId: z.string().min(1).optional(),
});

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // crockford-ish base32, no I/L/O/U/0/1

function makeToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

function callbackUrlFor(token: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (!origin) {
    throw new Error("NEXT_PUBLIC_APP_ORIGIN is not set");
  }
  return `${origin.replace(/\/$/, "")}/api/writing/result/${token}`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const token = makeToken();
  const now = Date.now();
  const expiresAt = now + TTL_MS;

  const db = getAdminDb();
  await db.collection("writingSessions").doc(token).set({
    token,
    lessonId: parsed.data.lessonId,
    profileId: parsed.data.profileId ?? null,
    status: "pending",
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(expiresAt),
    receivedAt: null,
    result: null,
    serverCreatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    token,
    callbackUrl: callbackUrlFor(token),
    expiresAt,
  });
}
```

- [ ] **Step 2: Create the result route**

`src/app/api/writing/result/[token]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { writingLLMResultSchema } from "@/lib/writing/result-schema";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const db = getAdminDb();
  const snap = await db.collection("writingSessions").doc(token).get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  const data = snap.data() ?? {};
  return NextResponse.json(
    {
      status: data.status,
      receivedAt: data.receivedAt ? (data.receivedAt as Timestamp).toMillis() : null,
    },
    { status: 200, headers: CORS_HEADERS },
  );
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const parsed = writingLLMResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const db = getAdminDb();
  const ref = db.collection("writingSessions").doc(token);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { code: 404 as const };
    const data = snap.data() ?? {};
    const expiresAt = data.expiresAt as Timestamp | undefined;
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
      return { code: 409 as const, reason: "expired" };
    }
    if (data.status !== "pending") {
      return { code: 409 as const, reason: "already_received" };
    }
    tx.update(ref, {
      status: "ready",
      result: parsed.data,
      receivedAt: Timestamp.fromMillis(Date.now()),
    });
    return { code: 200 as const };
  });

  if (result.code === 200) {
    return NextResponse.json(
      { ok: true, message: "Feedback received. The learner will see it now." },
      { status: 200, headers: CORS_HEADERS },
    );
  }
  if (result.code === 404) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  return NextResponse.json(
    { error: result.reason ?? "conflict" },
    { status: 409, headers: CORS_HEADERS },
  );
}
```

- [ ] **Step 3: Build to catch routing or import mistakes**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/writing
git commit -m "feat(writing): Vercel route handlers for relay session + result"
```

---

## Task 16: Build the `WritingSession` context

**Files:**
- Create: `src/components/writing/writing-session.tsx`

`WritingSession` is the writing equivalent of reading's `QuizSection`: it owns the user text, the MC picks, the relay token, the LLM result, and the submit action. It persists drafts to Dexie on changes, subscribes to Firestore once a token is set, and saves an attempt the moment the doc flips to `ready`.

- [ ] **Step 1: Implement**

`src/components/writing/writing-session.tsx`:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import {
  deleteWritingDraft,
  saveWritingAttempt,
  upsertWritingDraft,
} from "@/lib/db/queries";
import { scoreQuiz } from "@/lib/lessons/score";
import type { WritingLesson } from "@/lib/lessons/types";
import type { WritingDraft, WritingLLMResult } from "@/lib/db/types";

type Picks = Record<string, number>;
type Phase = "idle" | "waiting" | "ready";

type ContextValue = {
  lesson: WritingLesson;
  text: string;
  setText: (t: string) => void;
  mcPicks: Picks;
  setMcPick: (id: string, index: number) => void;
  sampleRevealed: boolean;
  revealSample: () => void;
  callbackUrl: string | null;
  sessionToken: string | null;
  phase: Phase;
  expired: boolean;
  llmResult: WritingLLMResult | null;
  /** Creates a session token and shows the prompt-copy panel. */
  startSession: () => Promise<void>;
  /** Cancels the current session and clears local state. */
  cancelSession: () => Promise<void>;
  /** Used by the paste-back flow to render the result without a relay round-trip. */
  applyResult: (result: WritingLLMResult) => void;
};

const WritingSessionContext = createContext<ContextValue | null>(null);

export function useWritingSession(): ContextValue {
  const ctx = useContext(WritingSessionContext);
  if (!ctx)
    throw new Error("useWritingSession must be used inside <WritingSessionProvider>");
  return ctx;
}

export function WritingSessionProvider({
  lesson,
  initialDraft,
  children,
}: {
  lesson: WritingLesson;
  initialDraft: WritingDraft | undefined;
  children: ReactNode;
}) {
  const profileId = useActiveProfileId();
  const [text, setText] = useState<string>(initialDraft?.text ?? "");
  const [mcPicks, setMcPicks] = useState<Picks>(initialDraft?.mcPicks ?? {});
  const [sampleRevealed, setSampleRevealed] = useState<boolean>(
    initialDraft?.sampleRevealed ?? false,
  );
  const [sessionToken, setSessionToken] = useState<string | null>(
    initialDraft?.sessionToken ?? null,
  );
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(
    initialDraft?.sessionToken ? "waiting" : "idle",
  );
  const [expired, setExpired] = useState(false);
  const [llmResult, setLlmResult] = useState<WritingLLMResult | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  // Debounced draft save
  const draftSaveRef = useRef<number | null>(null);
  useEffect(() => {
    if (draftSaveRef.current !== null) window.clearTimeout(draftSaveRef.current);
    draftSaveRef.current = window.setTimeout(() => {
      upsertWritingDraft({
        profileId,
        lessonId: lesson.id,
        text,
        mcPicks,
        sessionToken,
        sampleRevealed,
        updatedAt: Date.now(),
        durationMs: Date.now() - startedAtRef.current,
      }).catch(() => {});
    }, 600);
    return () => {
      if (draftSaveRef.current !== null) window.clearTimeout(draftSaveRef.current);
    };
  }, [profileId, lesson.id, text, mcPicks, sessionToken, sampleRevealed]);

  // Firestore subscription when a token is set
  useEffect(() => {
    if (!sessionToken) return;
    const ref = doc(getDb(), "writingSessions", sessionToken);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        if (!data) {
          setExpired(true);
          return;
        }
        const exp = data.expiresAt?.toMillis?.() as number | undefined;
        if (data.status === "ready" && data.result) {
          const result = data.result as WritingLLMResult;
          setLlmResult(result);
          setPhase("ready");
          // Persist as a completed attempt
          const mcResult = scoreQuiz(lesson.mcQuestions, mcPicks);
          const id =
            globalThis.crypto?.randomUUID?.() ??
            `att-${Math.random().toString(36).slice(2)}`;
          saveWritingAttempt({
            id,
            profileId,
            lessonId: lesson.id,
            startedAt: startedAtRef.current,
            completedAt: Date.now(),
            durationMs: Date.now() - startedAtRef.current,
            text,
            mcScore: mcResult.score,
            mcTotal: mcResult.total,
            mcPicks,
            llmResult: result,
            sampleRevealed,
          })
            .then(() => deleteWritingDraft(profileId, lesson.id))
            .then(() => {
              toast.success("Feedback received");
            })
            .catch(() => {});
          // Clear the token so a future attempt starts a fresh session
          setSessionToken(null);
        } else if (exp != null && Date.now() > exp) {
          setExpired(true);
        }
      },
      () => {
        // ignore; the SDK will auto-reconnect
      },
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- text/mcPicks intentionally captured at save time
  }, [sessionToken, lesson.id, lesson.mcQuestions, profileId, sampleRevealed]);

  const setMcPick = useCallback((id: string, index: number) => {
    setMcPicks((p) => ({ ...p, [id]: index }));
  }, []);

  const revealSample = useCallback(() => {
    setSampleRevealed(true);
  }, []);

  const startSession = useCallback(async () => {
    setLlmResult(null);
    setExpired(false);
    setPhase("waiting");
    const res = await fetch("/api/writing/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: lesson.id, profileId }),
    });
    if (!res.ok) {
      setPhase("idle");
      toast.error("Couldn't start a feedback session — please retry.");
      return;
    }
    const data = (await res.json()) as { token: string; callbackUrl: string };
    setSessionToken(data.token);
    setCallbackUrl(data.callbackUrl);
  }, [lesson.id, profileId]);

  const cancelSession = useCallback(async () => {
    setSessionToken(null);
    setCallbackUrl(null);
    setPhase("idle");
    setExpired(false);
    setLlmResult(null);
  }, []);

  const applyResult = useCallback((result: WritingLLMResult) => {
    setLlmResult(result);
    setPhase("ready");
    setSessionToken(null);
    setCallbackUrl(null);
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      lesson,
      text,
      setText,
      mcPicks,
      setMcPick,
      sampleRevealed,
      revealSample,
      callbackUrl,
      sessionToken,
      phase,
      expired,
      llmResult,
      startSession,
      cancelSession,
      applyResult,
    }),
    [
      lesson,
      text,
      mcPicks,
      setMcPick,
      sampleRevealed,
      revealSample,
      callbackUrl,
      sessionToken,
      phase,
      expired,
      llmResult,
      startSession,
      cancelSession,
      applyResult,
    ],
  );

  return (
    <WritingSessionContext.Provider value={value}>
      {children}
    </WritingSessionContext.Provider>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/writing/writing-session.tsx
git commit -m "feat(writing): WritingSession context with draft + relay subscription"
```

---

## Task 17: Build the writing UI components

Each sub-step adds one component, commits at the end of the task.

**Files (all new under `src/components/writing/`):**
- `writing-prompt-card.tsx`
- `hint-panel.tsx`
- `writing-editor.tsx`
- `sample-answer-reveal.tsx`
- `prompt-copy-panel.tsx`
- `writing-result-waiting.tsx`
- `writing-result-panel.tsx`
- `writing-attempt-history.tsx`

- [ ] **Step 1: `writing-prompt-card.tsx`**

```tsx
"use client";

import type { WritingLesson } from "@/lib/lessons/types";

export function WritingPromptCard({ lesson }: { lesson: WritingLesson }) {
  const wordHint =
    lesson.minWords && lesson.maxWords
      ? `Aim for ${lesson.minWords}–${lesson.maxWords} words.`
      : lesson.minWords
        ? `Aim for at least ${lesson.minWords} words.`
        : lesson.maxWords
          ? `Aim for at most ${lesson.maxWords} words.`
          : null;
  return (
    <section className="mb-4 rounded-md border bg-muted/40 p-3 text-sm shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Topic
      </p>
      <p className="mt-0.5 text-sm font-semibold">{lesson.topic}</p>
      <p className="mt-2 italic">{lesson.prompt}</p>
      {wordHint && <p className="mt-2 text-xs text-muted-foreground">{wordHint}</p>}
    </section>
  );
}
```

- [ ] **Step 2: `hint-panel.tsx`**

```tsx
"use client";

import type { WritingLesson } from "@/lib/lessons/types";

export function HintPanel({ lesson }: { lesson: WritingLesson }) {
  return (
    <section className="rounded-md border bg-card p-3 sm:p-4 text-sm shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Hints
      </h2>
      {lesson.hintStarters.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold">Sentence starters</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {lesson.hintStarters.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {lesson.hintVocab.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold">Useful words</p>
          <ul className="space-y-0.5 text-sm">
            {lesson.hintVocab.map((v) => (
              <li key={v.phrase} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{v.phrase}</span>
                {v.pronunciation && (
                  <span className="text-xs text-muted-foreground">
                    {v.pronunciation}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">— {v.meaningVi}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: `writing-editor.tsx`**

```tsx
"use client";

import { useMemo } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useWritingSession } from "./writing-session";
import { cn } from "@/lib/utils";

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function WritingEditor() {
  const { lesson, text, setText } = useWritingSession();
  const words = useMemo(() => countWords(text), [text]);
  const min = lesson.minWords;
  const max = lesson.maxWords;
  const tooShort = min != null && words < min;
  const tooLong = max != null && words > max;

  async function copyText() {
    if (!text) {
      toast.error("Write something first.");
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success("Copied your text");
  }

  return (
    <section className="rounded-md border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Your writing</h2>
        <button
          type="button"
          onClick={copyText}
          className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-accent"
        >
          <Copy className="size-3" aria-hidden="true" />
          Copy text
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your response here…"
        className="min-h-[10rem] w-full resize-y rounded border bg-background p-2 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-ring"
      />
      <p
        className={cn(
          "mt-1 text-xs",
          tooShort || tooLong ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        )}
      >
        {words} word{words === 1 ? "" : "s"}
        {min != null || max != null
          ? ` · target ${min ?? "?"}–${max ?? "?"}`
          : ""}
      </p>
    </section>
  );
}
```

- [ ] **Step 4: `sample-answer-reveal.tsx`**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GrammarNotes } from "@/components/reading/grammar-notes";
import { useWritingSession } from "./writing-session";

export function SampleAnswerReveal() {
  const { lesson, sampleRevealed, revealSample } = useWritingSession();
  const [open, setOpen] = useState(sampleRevealed);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !sampleRevealed) revealSample();
  }

  return (
    <section className="rounded-md border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-sm font-semibold"
        aria-expanded={open}
      >
        <span>Sample answer{sampleRevealed && !open ? " (viewed)" : ""}</span>
        {open ? (
          <ChevronUp className="size-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <article className="text-sm leading-relaxed">{lesson.sampleText}</article>
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide">
              Vietnamese translation
            </summary>
            <p className="mt-2 leading-relaxed">{lesson.sampleTranslationVi}</p>
          </details>
          {lesson.sampleGrammarNotes.length > 0 && (
            <GrammarNotes notes={lesson.sampleGrammarNotes} />
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: `prompt-copy-panel.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Copy, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { writingLLMResultSchema } from "@/lib/writing/result-schema";
import { buildLLMPrompt, buildPasteBackPrompt } from "@/lib/writing/prompt";
import { useWritingSession } from "./writing-session";
import {
  saveWritingAttempt,
  deleteWritingDraft,
} from "@/lib/db/queries";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import { scoreQuiz } from "@/lib/lessons/score";

function extractJsonBlock(s: string): string | null {
  const fenced = s.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return s.slice(firstBrace, lastBrace + 1);
  }
  return null;
}

export function PromptCopyPanel() {
  const profileId = useActiveProfileId();
  const {
    lesson,
    text,
    callbackUrl,
    sessionToken,
    startSession,
    mcPicks,
    sampleRevealed,
    applyResult,
  } = useWritingSession();
  const [pasteBack, setPasteBack] = useState("");

  async function copyPrompt() {
    if (!text.trim()) {
      toast.error("Write something first.");
      return;
    }
    if (!callbackUrl) {
      await startSession();
      toast.info("Session ready — click Copy prompt again.");
      return;
    }
    const prompt = buildLLMPrompt({ lesson, userText: text, callbackUrl });
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied — paste it into ChatGPT or Gemini");
  }

  async function copyPasteBackPrompt() {
    if (!text.trim()) {
      toast.error("Write something first.");
      return;
    }
    const prompt = buildPasteBackPrompt({ lesson, userText: text });
    await navigator.clipboard.writeText(prompt);
    toast.success("Paste-back prompt copied");
  }

  async function submitPasteBack() {
    const raw = extractJsonBlock(pasteBack);
    if (!raw) {
      toast.error("Couldn't find a JSON block in the pasted response.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      toast.error("Invalid JSON in pasted response.");
      return;
    }
    const result = writingLLMResultSchema.safeParse(parsed);
    if (!result.success) {
      toast.error("Pasted JSON does not match the expected shape.");
      return;
    }
    const mcResult = scoreQuiz(lesson.mcQuestions, mcPicks);
    const id = globalThis.crypto?.randomUUID?.() ?? `att-${Date.now()}`;
    await saveWritingAttempt({
      id,
      profileId,
      lessonId: lesson.id,
      startedAt: Date.now(),
      completedAt: Date.now(),
      durationMs: 0,
      text,
      mcScore: mcResult.score,
      mcTotal: mcResult.total,
      mcPicks,
      llmResult: result.data,
      sampleRevealed,
    });
    await deleteWritingDraft(profileId, lesson.id);
    applyResult(result.data);
    setPasteBack("");
    toast.success("Feedback saved");
  }

  return (
    <section className="rounded-md border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <h2 className="mb-2 text-sm font-semibold">Get AI feedback</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Copy the prompt below, paste it into ChatGPT or Gemini, and your feedback
        will show up here automatically when the model replies.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={copyPrompt} className="gap-1" size="sm">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {callbackUrl ? "Copy prompt + my text" : "Get AI feedback"}
        </Button>
        <Button
          onClick={copyPasteBackPrompt}
          variant="outline"
          className="gap-1"
          size="sm"
        >
          <Wand2 className="size-3.5" aria-hidden="true" />
          Copy paste-back prompt
        </Button>
      </div>
      {callbackUrl && (
        <p className="mt-3 break-all text-[0.7rem] text-muted-foreground">
          Callback URL: <span className="font-mono">{callbackUrl}</span>
          {sessionToken && (
            <>
              {" "}
              ·{" "}
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={async () => {
                  await navigator.clipboard.writeText(callbackUrl);
                  toast.success("Callback URL copied");
                }}
              >
                <Copy className="inline size-3" aria-hidden="true" /> copy
              </button>
            </>
          )}
        </p>
      )}
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          Or paste the AI's JSON response here
        </summary>
        <textarea
          value={pasteBack}
          onChange={(e) => setPasteBack(e.target.value)}
          placeholder='```json\n{ "scores": {...}, ... }\n```'
          className="mt-2 min-h-[6rem] w-full resize-y rounded border bg-background p-2 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          onClick={submitPasteBack}
          size="sm"
          variant="outline"
          className="mt-2"
        >
          Submit pasted feedback
        </Button>
      </details>
    </section>
  );
}
```

- [ ] **Step 6: `writing-result-waiting.tsx`**

```tsx
"use client";

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWritingSession } from "./writing-session";

export function WritingResultWaiting() {
  const { cancelSession, expired, callbackUrl } = useWritingSession();
  return (
    <section className="rounded-md border border-dashed bg-card p-3 sm:p-4 text-sm shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 font-semibold">
          {expired ? (
            "This session expired — generate a new prompt."
          ) : (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Waiting for AI feedback…
            </>
          )}
        </p>
        <Button onClick={cancelSession} size="sm" variant="ghost" className="gap-1">
          <X className="size-3.5" aria-hidden="true" />
          Cancel & retry
        </Button>
      </div>
      {callbackUrl && !expired && (
        <p className="mt-2 break-all text-[0.7rem] text-muted-foreground">
          Listening on: <span className="font-mono">{callbackUrl}</span>
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 7: `writing-result-panel.tsx`**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WritingLLMResult } from "@/lib/db/types";

function scoreColor(v: number): string {
  if (v >= 8) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (v >= 5) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
}

export function WritingResultPanel({ result }: { result: WritingLLMResult }) {
  const [showRewritten, setShowRewritten] = useState(false);
  const s = result.scores;
  const entries: [string, number][] = [
    ["Overall", s.overall],
    ["Task", s.task],
    ["Grammar", s.grammar],
    ["Vocabulary", s.vocabulary],
    ["Coherence", s.coherence],
  ];

  return (
    <section className="space-y-3 rounded-md border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <h2 className="text-sm font-semibold">AI feedback</h2>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([k, v]) => (
          <span
            key={k}
            className={cn(
              "inline-flex items-baseline gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              scoreColor(v),
            )}
          >
            <span className="font-semibold">{k}</span>
            <span>{v.toFixed(1)}/10</span>
          </span>
        ))}
      </div>

      {result.corrections.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Corrections
          </p>
          <ul className="space-y-2">
            {result.corrections.map((c, i) => (
              <li key={i} className="rounded border p-2 text-sm">
                <p>
                  <span className="text-rose-700 line-through dark:text-rose-300">
                    {c.original}
                  </span>{" "}
                  →{" "}
                  <span className="text-emerald-700 dark:text-emerald-300">
                    {c.fixed}
                  </span>
                </p>
                {c.explanation && (
                  <p className="mt-1 text-xs text-muted-foreground">{c.explanation}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Suggestions
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {result.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowRewritten((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          aria-expanded={showRewritten}
        >
          Polished version
          {showRewritten ? (
            <ChevronUp className="size-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3" aria-hidden="true" />
          )}
        </button>
        {showRewritten && (
          <p className="mt-2 rounded bg-muted/40 p-2 text-sm leading-relaxed">
            {result.rewritten}
          </p>
        )}
      </div>

      {result.model && (
        <p className="text-[0.7rem] text-muted-foreground">Model: {result.model}</p>
      )}
    </section>
  );
}
```

- [ ] **Step 8: `writing-attempt-history.tsx`**

```tsx
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  listWritingAttemptsForLesson,
  resetWritingProgress,
} from "@/lib/db/queries";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
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
import { WritingResultPanel } from "./writing-result-panel";

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString();
}

export function WritingAttemptHistory({ lessonId }: { lessonId: string }) {
  const profileId = useActiveProfileId();
  const attempts = useLiveQuery(
    () => listWritingAttemptsForLesson(profileId, lessonId),
    [profileId, lessonId],
  );
  if (!attempts || attempts.length === 0) return null;

  async function handleReset() {
    await resetWritingProgress(profileId, lessonId);
    toast.success("Writing progress reset");
  }

  return (
    <section className="mt-6 rounded-md border bg-card p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Past attempts</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Reset progress
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset writing progress?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes all writing attempts and the in-progress draft for
                this lesson. Bookmarks and notes are kept. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <ul className="space-y-3">
        {[...attempts].reverse().map((a) => (
          <li key={a.id} className="rounded border p-3">
            <p className="text-xs text-muted-foreground">
              {fmtDate(a.completedAt)}
              {a.sampleRevealed && " · sample viewed"}
              {" · MC "}
              {a.mcScore}/{a.mcTotal}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Show my text + feedback
              </summary>
              <div className="mt-2 space-y-2">
                <p className="whitespace-pre-wrap rounded bg-muted/40 p-2 text-sm">
                  {a.text}
                </p>
                {a.llmResult && <WritingResultPanel result={a.llmResult} />}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 9: Type-check all new components**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/writing
git commit -m "feat(writing): editor, hints, sample reveal, prompt copy, result, history"
```

---

## Task 18: Build the lesson-detail page

**Files:**
- Create: `src/app/(app)/writing/[lessonId]/page.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { Suspense, use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useWritingLesson } from "@/lib/lessons/load";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import { getWritingDraft } from "@/lib/db/queries";
import { usePreferences } from "@/lib/db/use-preferences";
import { LessonTimer } from "@/components/reading/lesson-timer";
import { HintSettingsPopover } from "@/components/reading/hint-settings-popover";
import { LayoutToggle } from "@/components/reading/layout-toggle";
import { BookmarkButton } from "@/components/reading/bookmark-button";
import { LessonNotes } from "@/components/reading/lesson-notes";
import { MCQuestions } from "@/components/reading/mc-questions";
import { cn } from "@/lib/utils";
import type { WritingLesson } from "@/lib/lessons/types";
import {
  WritingSessionProvider,
  useWritingSession,
} from "@/components/writing/writing-session";
import { WritingPromptCard } from "@/components/writing/writing-prompt-card";
import { HintPanel } from "@/components/writing/hint-panel";
import { WritingEditor } from "@/components/writing/writing-editor";
import { SampleAnswerReveal } from "@/components/writing/sample-answer-reveal";
import { PromptCopyPanel } from "@/components/writing/prompt-copy-panel";
import { WritingResultWaiting } from "@/components/writing/writing-result-waiting";
import { WritingResultPanel } from "@/components/writing/writing-result-panel";
import { WritingAttemptHistory } from "@/components/writing/writing-attempt-history";

const LEVEL_CLASS: Record<WritingLesson["level"], string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

function MainArea() {
  const { lesson, mcPicks, setMcPick, phase, llmResult } = useWritingSession();
  const prefs = usePreferences();
  return (
    <>
      <WritingPromptCard lesson={lesson} />

      <div
        className={cn(
          "gap-3 sm:gap-4",
          prefs.detailLayout === "two-column"
            ? "grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]"
            : "flex flex-col",
        )}
      >
        <div className="space-y-3">
          <WritingEditor />
          <SampleAnswerReveal />
        </div>
        <div className="space-y-3">
          <HintPanel lesson={lesson} />
        </div>
      </div>

      <section className="mt-3 rounded-md sm:mt-4 border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
        <MCQuestions
          showHint={prefs.hintToggles.perQuestionHint}
          questions={lesson.mcQuestions}
          picks={mcPicks}
          onPick={setMcPick}
          label="Sentence-choice quiz"
        />
      </section>

      <div className="mt-3 sm:mt-4 space-y-3">
        <PromptCopyPanel />
        {phase === "waiting" && <WritingResultWaiting />}
        {phase === "ready" && llmResult && <WritingResultPanel result={llmResult} />}
      </div>

      {lesson.criticalThinkingQuestion && (
        <section className="mt-3 rounded-md sm:mt-4 border-l-4 border-primary bg-muted/40 p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Critical thinking
          </h2>
          <p className="text-sm italic leading-relaxed">
            {lesson.criticalThinkingQuestion}
          </p>
        </section>
      )}

      <WritingAttemptHistory lessonId={lesson.id} />
      <LessonNotes lessonId={lesson.id} />
    </>
  );
}

function LessonDetailContent({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = use(params);
  const profileId = useActiveProfileId();
  const { data: lesson } = useWritingLesson(lessonId);
  const draft = useLiveQuery(
    () => getWritingDraft(profileId, lessonId),
    [profileId, lessonId],
  );

  if (!lesson) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <header className="sticky top-0 z-30 -mx-4 mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2 bg-background/90 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6 sm:py-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/writing"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Back to Writing
          </Link>
          <h1 className="text-lg font-semibold leading-tight sm:text-xl">
            {lesson.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded px-1.5 py-0.5 font-semibold", LEVEL_CLASS[lesson.level])}>
              {lesson.level}
            </span>
            {lesson.tags.map((t) => (
              <span key={t} className="text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BookmarkButton lessonId={lessonId} variant="inline" />
          <LessonTimer />
          <HintSettingsPopover />
          <LayoutToggle />
        </div>
      </header>

      <WritingSessionProvider lesson={lesson} initialDraft={draft}>
        <MainArea />
      </WritingSessionProvider>
    </div>
  );
}

export default function WritingLessonDetailPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <LessonDetailContent params={params} />
    </Suspense>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Smoke test (UI without Firebase)**

Run: `npm run dev`. Open `http://localhost:4600/writing/writing-a1-001`. Confirm:
- Header, topic card, editor, sample-reveal, hint panel, MC quiz, prompt-copy panel all render.
- Typing in the editor updates the word counter.
- Clicking the sample-reveal toggle expands/collapses and persists across reload.
- Clicking the MC options updates picks (no errors in console).
- Clicking "Get AI feedback" without Firebase env will toast an error — that's expected at this point.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/writing/\[lessonId\]
git commit -m "feat(writing): lesson-detail page wiring all writing components"
```

---

## Task 19: End-to-end manual verification with Firebase

This is the integration check. It requires Firebase env vars to be set locally (or use the Firebase emulator).

- [ ] **Step 1: Set up local Firebase env**

Create `.env.local` (gitignored) with values from your Firebase project. Set `NEXT_PUBLIC_APP_ORIGIN=http://localhost:4600`.

In the Firebase console:
- Enable Firestore (production or emulator).
- Add a security rule:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /writingSessions/{token} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

- Enable TTL on `expiresAt` in the `writingSessions` collection.

- [ ] **Step 2: Run dev server + create a session**

Run: `npm run dev`. Open `http://localhost:4600/writing/writing-a1-001`.

Write 2–3 sentences. Click "Get AI feedback" — you should see the "Waiting for AI feedback…" panel with a callback URL.

In a second terminal, POST a fake result to your local server:

```bash
TOKEN=<paste-the-token-from-the-callback-URL>
curl -X POST "http://localhost:4600/api/writing/result/$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scores": {"task":7,"grammar":7,"vocabulary":7,"coherence":7,"overall":7},
    "corrections":[{"original":"I goes","fixed":"I go","explanation":"Subject-verb agreement."}],
    "suggestions":["Add one sentence about an evening activity."],
    "rewritten":"On weekends, I usually relax at home and read a book.",
    "model":"manual-test"
  }'
```

Expected: in the browser, the waiting panel disappears and the result panel renders the scores, the correction, the suggestion, and the polished rewrite. A "Past attempts" section appears below with the saved attempt.

- [ ] **Step 3: Verify idempotency**

Run the same curl again with the same token.
Expected: HTTP 409 with `{"error":"already_received"}`.

- [ ] **Step 4: Verify validation**

```bash
curl -X POST "http://localhost:4600/api/writing/result/anything" \
  -H "Content-Type: application/json" -d '{}'
```

Expected: HTTP 400 with `error: "invalid_payload"`.

- [ ] **Step 5: Verify expiry**

Manually edit a Firestore session doc to have `expiresAt` in the past. POST a result.
Expected: HTTP 409 with `{"error":"expired"}`.

- [ ] **Step 6: Commit (env example only — no code changes)**

If `.env.example` needs further tweaks for clarity, commit them. Otherwise skip:

```bash
git status
# only if changes:
git add .env.example
git commit -m "docs(writing): clarify Firebase env vars"
```

---

## Task 20: Run the full test suite and the build

- [ ] **Step 1: Tests**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors. (Warnings are acceptable but address any new ones in writing/* files.)

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds. Skim the output for any warnings about the new routes/components.

- [ ] **Step 4: Commit any fixes that were needed**

If lint or build flagged issues, fix them inline and commit:

```bash
git add -p
git commit -m "fix(writing): address lint/build warnings"
```

---

## Done criteria

- `/writing` lists the seeded A1 lesson with filters, search, sort, favorites, learning/learned chips identical in behavior to `/reading`.
- `/writing/writing-a1-001` shows the topic, prompt, hint panel, editor with word count, MC quiz, sample-reveal toggle, prompt-copy panel, attempt history, and notes.
- Clicking "Get AI feedback" creates a Firestore session, copying the prompt embeds the live callback URL, and posting a valid result to that URL causes the UI to flip to the result panel without a page reload.
- A new row appears in `writingAttempts` (verifiable in DevTools → Application → IndexedDB → `english-learning` → `writingAttempts`).
- All existing reading and listening flows are unchanged (regression check via Task 11/13 smoke tests and the full test suite).
