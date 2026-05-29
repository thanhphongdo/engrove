# Speaking Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full Speaking skill — hub page (`/speaking`) with lesson grid, detail page (`/speaking/[lessonId]`) with Listen + Practice tabs, turn-by-turn recording session, in-browser MP3 mixing with lamejs, IndexedDB persistence, and a generate-audio.py extension for per-lesson CDN audio.

**Architecture:** Speaking lessons are JSON files in `public/lessons/speaking/{level}/` validated by a new Zod schema. The hub page clones the listening hub pattern but uses speaking-specific "Learned/Learning" status (recordings + session drafts, not quiz attempts). The detail page reuses TranscriptPlayer for the Listen tab and adds a new PracticeSession state machine for the Practice tab. Recorded blobs are mixed in-browser via a lame Web Worker and stored in Dexie v6.

**Tech Stack:** Next.js App Router, React, Zod, Dexie v6 + dexie-react-hooks, Zustand (listening audio store reused for Listen tab), MediaRecorder API, Web Audio API (AudioContext), lamejs (Web Worker), Fuse.js, React Query, Vitest.

---

## File Map

**Create:**
- `src/lib/lessons/speaking-schema.ts` — Zod schema + inferred TS types
- `src/lib/lessons/speaking-schema.test.ts` — Schema invariant tests
- `src/lib/db/use-speaking-recordings.ts` — Recordings hooks (list, map, save, delete)
- `src/lib/db/use-speaking-session-draft.ts` — Session draft hooks (get, save, delete, hub set)
- `src/lib/audio/recorder.ts` — MediaRecorder + silence detection + RMS level
- `src/lib/audio/mixer.ts` — AudioContext concat + lamejs encode
- `src/lib/audio/lame-worker.ts` — Web Worker: PCM → MP3
- `src/components/speaking/lesson-card.tsx` — Hub card with characters badge + status
- `src/components/speaking/sample-listen-tab.tsx` — Listen tab: TranscriptPlayer adapter
- `src/components/speaking/voice-visualizer.tsx` — Animated RMS bars for mic input
- `src/components/speaking/recorder-button.tsx` — Record/stop button with states
- `src/components/speaking/turn-row.tsx` — Single dialogue turn (system or user)
- `src/components/speaking/hint-panel.tsx` — Sidebar: vocab + starters + grammar
- `src/components/speaking/mix-result-card.tsx` — Post-mix: inline player + download
- `src/components/speaking/recordings-history.tsx` — My recordings: play/download/delete
- `src/components/speaking/practice-session.tsx` — Full Practice tab state machine
- `src/app/(app)/speaking/page.tsx` — Hub page
- `src/app/(app)/speaking/[lessonId]/page.tsx` — Detail page
- `public/lessons/speaking/index.json` — Empty hub index (to be populated by rebuild script)
- `public/lessons/speaking/a1/speaking-a1-001.json` — Sample lesson for manual testing
- `.claude/skills/generate-speaking-lesson/SKILL.md` — AI skill for lesson generation

**Modify:**
- `src/lib/db/types.ts` — Add `SpeakingRecording`, `SpeakingSessionDraft`
- `src/lib/db/client.ts` — Add Dexie v6 migration with two new tables
- `src/lib/lessons/load.ts` — Add `useSpeakingLessonsIndex()`, `useSpeakingLesson()`, extend `LessonKind`
- `scripts/rebuild-indexes.mjs` — Add `rebuildSpeaking()` function
- `scripts/validate-lessons.mjs` — Add speaking schema validation
- `scripts/generate-audio.py` — Add `--kind speaking` flag + `process_speaking_lesson()`
- `src/components/app-shell/nav-config.ts` — Remove `comingSoon: true` from Speaking entry

---

## Task 1: Zod Schema + TypeScript Types

**Files:**
- Create: `src/lib/lessons/speaking-schema.ts`
- Create: `src/lib/lessons/speaking-schema.test.ts`

- [ ] **Step 1: Read the existing schema.ts to understand the pattern**

```bash
cat src/lib/lessons/schema.ts | head -100
```

Expected: sees `z.object()`, `superRefine`, exported types via `z.infer<>`.

- [ ] **Step 2: Write the failing schema tests**

```typescript
// src/lib/lessons/speaking-schema.test.ts
import { describe, it, expect } from "vitest";
import { speakingLessonSchema, speakingLessonMetaSchema } from "./speaking-schema";

const VALID_LESSON = {
  id: "speaking-a1-001",
  level: "A1",
  title: "Ordering coffee",
  summary: "A customer orders an iced latte at a café.",
  topic: "Ordering at a café",
  tags: ["Daily life", "Café"],
  characters: ["Customer", "Barista"] as [string, string],
  voices: {
    Customer: { sex: "female", age: "adult", accent: "en-US", edgeVoice: "en-US-JennyNeural" },
    Barista:  { sex: "male",   age: "adult", accent: "en-US", edgeVoice: "en-US-GuyNeural" },
  },
  body: [
    { speaker: "Customer", text: "Hi, can I get an iced latte, please?" },
    { speaker: "Barista",  text: "Sure. What size?" },
  ],
  sentences: [
    { id: "s1", speaker: "Customer", text: "Hi, can I get an iced latte, please?" },
    { id: "s2", speaker: "Barista",  text: "Sure." },
    { id: "s3", speaker: "Barista",  text: "What size?" },
  ],
  hintStarters: [{ id: "h1", text: "Could I have a …, please?" }],
  hintVocab: [{ id: "v1", phrase: "iced latte", meaningVi: "cà phê sữa đá", pronunciation: "/aɪst ˈlɑː.teɪ/" }],
  annotations: [{ phrase: "iced latte", meaningVi: "cà phê sữa đá", pronunciation: "/aɪst ˈlɑː.teɪ/" }],
  grammarNotes: [{ title: "Polite requests", bodyVi: "Dùng 'Can I…'", bodyEn: "Use 'Can I…'" }],
  translationVi: "Khách: Cho tôi cà phê sữa đá…",
  criticalThinkingQuestion: "Why does tone matter when ordering?",
  audio: { cdnBase: "https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main/speaking-a1-001", manifestVersion: 1 },
  accents: ["en-US"] as ["en-US"],
};

describe("speakingLessonSchema", () => {
  it("accepts a valid lesson", () => {
    expect(speakingLessonSchema.safeParse(VALID_LESSON).success).toBe(true);
  });

  it("rejects a character not in voices", () => {
    const bad = { ...VALID_LESSON, characters: ["Customer", "Unknown"] as [string, string] };
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects non-contiguous sentence ids", () => {
    const bad = { ...VALID_LESSON, sentences: [
      { id: "s1", speaker: "Customer", text: "Hi, can I get an iced latte, please?" },
      { id: "s3", speaker: "Barista",  text: "Sure." },
      { id: "s4", speaker: "Barista",  text: "What size?" },
    ]};
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects sentences that don't match body turns", () => {
    const bad = { ...VALID_LESSON, sentences: [
      { id: "s1", speaker: "Customer", text: "Hello there." },
      { id: "s2", speaker: "Barista",  text: "Sure." },
      { id: "s3", speaker: "Barista",  text: "What size?" },
    ]};
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects non-sequential hintStarters ids", () => {
    const bad = { ...VALID_LESSON, hintStarters: [{ id: "h2", text: "test" }] };
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects non-sequential hintVocab ids", () => {
    const bad = { ...VALID_LESSON, hintVocab: [{ id: "v2", phrase: "x", meaningVi: "y", pronunciation: "z" }] };
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects non-en-US voices", () => {
    const bad = {
      ...VALID_LESSON,
      voices: { ...VALID_LESSON.voices, Barista: { sex: "male", age: "adult", accent: "en-GB", edgeVoice: "en-GB-RyanNeural" } },
    };
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });
});

describe("speakingLessonMetaSchema", () => {
  it("accepts valid meta with turnCount and sentenceCount", () => {
    const meta = {
      id: "speaking-a1-001", level: "A1", title: "T", summary: "S", topic: "X",
      tags: ["a"], characters: ["Customer", "Barista"] as [string, string],
      sentenceCount: 3, turnCount: 2,
    };
    expect(speakingLessonMetaSchema.safeParse(meta).success).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test src/lib/lessons/speaking-schema.test.ts
```

Expected: FAIL — `speaking-schema` module not found.

- [ ] **Step 4: Write the schema implementation**

```typescript
// src/lib/lessons/speaking-schema.ts
import { z } from "zod";

const speakingVoiceSchema = z.object({
  sex: z.enum(["female", "male"]),
  age: z.enum(["child", "teen", "adult", "senior"]),
  accent: z.literal("en-US"),
  edgeVoice: z.string().min(1),
});

const speakingSentenceSchema = z.object({
  id: z.string(),
  speaker: z.string().min(1),
  text: z.string().min(1),
  durationMs: z.number().int().positive().optional(),
});

const hintStarterSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
});

const hintVocabSchema = z.object({
  id: z.string(),
  phrase: z.string().min(1),
  meaningVi: z.string().min(1),
  pronunciation: z.string().min(1),
});

export const speakingLessonSchema = z
  .object({
    id: z.string().regex(/^speaking-(a1|a2|b1|b2|c1)-\d{3}$/),
    level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
    title: z.string().min(1),
    summary: z.string().min(1),
    topic: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    characters: z.tuple([z.string().min(1), z.string().min(1)]),
    voices: z.record(speakingVoiceSchema),
    body: z.array(z.object({ speaker: z.string().min(1), text: z.string().min(1) })).min(2),
    sentences: z.array(speakingSentenceSchema).min(2),
    hintStarters: z.array(hintStarterSchema).min(1),
    hintVocab: z.array(hintVocabSchema).min(1),
    annotations: z.array(
      z.object({
        phrase: z.string().min(1),
        meaningVi: z.string().min(1),
        pronunciation: z.string().optional(),
        exampleEn: z.string().optional(),
      }),
    ),
    grammarNotes: z.array(
      z.object({ title: z.string().min(1), bodyVi: z.string().min(1), bodyEn: z.string().min(1) }),
    ),
    translationVi: z.string().min(1),
    criticalThinkingQuestion: z.string().min(1),
    audio: z.object({
      cdnBase: z.string().url(),
      manifestVersion: z.number().int().positive(),
    }),
    totalDurationMs: z.number().int().positive().optional(),
    accents: z.tuple([z.literal("en-US")]),
  })
  .superRefine((data, ctx) => {
    const voiceKeys = new Set(Object.keys(data.voices));

    // Invariant 1: characters are keys in voices
    for (const char of data.characters) {
      if (!voiceKeys.has(char)) {
        ctx.addIssue({ code: "custom", message: `Character "${char}" not found in voices`, path: ["voices"] });
      }
    }

    // Invariant 3: sentence speakers exist in voices
    for (let i = 0; i < data.sentences.length; i++) {
      if (!voiceKeys.has(data.sentences[i].speaker)) {
        ctx.addIssue({
          code: "custom",
          message: `sentences[${i}].speaker "${data.sentences[i].speaker}" not in voices`,
          path: ["sentences", i, "speaker"],
        });
      }
    }

    // Invariant 4: sentence ids contiguous s1..sN
    for (let i = 0; i < data.sentences.length; i++) {
      if (data.sentences[i].id !== `s${i + 1}`) {
        ctx.addIssue({
          code: "custom",
          message: `Expected sentences[${i}].id "s${i + 1}", got "${data.sentences[i].id}"`,
          path: ["sentences", i, "id"],
        });
      }
    }

    // Invariant 5: grouped sentences concatenate to body turns
    let si = 0;
    for (let bi = 0; bi < data.body.length; bi++) {
      const turn = data.body[bi];
      const accumulated: string[] = [];
      const startSi = si;
      while (si < data.sentences.length && data.sentences[si].speaker === turn.speaker) {
        accumulated.push(data.sentences[si].text);
        si++;
        if (accumulated.join(" ").trim() === turn.text.trim()) break;
      }
      if (accumulated.join(" ").trim() !== turn.text.trim()) {
        ctx.addIssue({
          code: "custom",
          message: `body[${bi}] "${turn.text}" ≠ sentences[${startSi}..${si - 1}] joined "${accumulated.join(" ")}"`,
          path: ["body", bi],
        });
      }
    }
    if (si < data.sentences.length) {
      ctx.addIssue({
        code: "custom",
        message: `${data.sentences.length - si} sentence(s) not consumed by body turns`,
        path: ["sentences"],
      });
    }

    // Invariant 6: hintStarters ids h1..hK
    for (let i = 0; i < data.hintStarters.length; i++) {
      if (data.hintStarters[i].id !== `h${i + 1}`) {
        ctx.addIssue({
          code: "custom",
          message: `Expected hintStarters[${i}].id "h${i + 1}", got "${data.hintStarters[i].id}"`,
          path: ["hintStarters", i, "id"],
        });
      }
    }

    // Invariant 6: hintVocab ids v1..vM
    for (let i = 0; i < data.hintVocab.length; i++) {
      if (data.hintVocab[i].id !== `v${i + 1}`) {
        ctx.addIssue({
          code: "custom",
          message: `Expected hintVocab[${i}].id "v${i + 1}", got "${data.hintVocab[i].id}"`,
          path: ["hintVocab", i, "id"],
        });
      }
    }
  });

export const speakingLessonMetaSchema = z.object({
  id: z.string(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  topic: z.string().min(1),
  tags: z.array(z.string().min(1)),
  characters: z.tuple([z.string().min(1), z.string().min(1)]),
  totalDurationMs: z.number().int().positive().optional(),
  sentenceCount: z.number().int().nonnegative(),
  turnCount: z.number().int().positive(),
});

export const speakingLessonsIndexSchema = z.array(speakingLessonMetaSchema);

export type SpeakingLesson     = z.infer<typeof speakingLessonSchema>;
export type SpeakingLessonMeta = z.infer<typeof speakingLessonMetaSchema>;
export type SpeakingVoice      = z.infer<typeof speakingVoiceSchema>;
export type SpeakingSentence   = z.infer<typeof speakingSentenceSchema>;
export type HintStarter        = z.infer<typeof hintStarterSchema>;
export type HintVocab          = z.infer<typeof hintVocabSchema>;
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test src/lib/lessons/speaking-schema.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/lessons/speaking-schema.ts src/lib/lessons/speaking-schema.test.ts
git commit -m "feat: add speaking lesson Zod schema + TypeScript types"
```

---

## Task 2: Dexie v6 Migration + DB Types

**Files:**
- Modify: `src/lib/db/types.ts`
- Modify: `src/lib/db/client.ts`

- [ ] **Step 1: Read the current types.ts and client.ts to understand what's there**

```bash
cat src/lib/db/types.ts
cat src/lib/db/client.ts
```

Expected: `types.ts` has `WritingAttempt` as last type. `client.ts` is at `this.version(5)`.

- [ ] **Step 2: Add SpeakingRecording and SpeakingSessionDraft to types.ts**

Append to the bottom of `src/lib/db/types.ts`:

```typescript
export type SpeakingRecording = {
  id: string;          // crypto.randomUUID()
  profileId: string;
  lessonId: string;
  role: string;        // character name the user played
  completedAt: number; // Unix ms
  durationMs: number;
  turnCount: number;
  mp3Blob: Blob;       // stored locally only, never uploaded
};

export type SpeakingSessionDraft = {
  profileId: string;
  lessonId: string;
  role: string;
  turnBlobs: Record<number, Blob>; // turnIndex → recorded Blob
  updatedAt: number;
};
```

- [ ] **Step 3: Add v6 migration to client.ts**

First add the imports at the top of the import block:

```typescript
import type { SpeakingRecording, SpeakingSessionDraft } from "./types";
```

Add table declarations in the class body (after `writingAttempts`):

```typescript
speakingRecordings!: Table<SpeakingRecording, string>;
speakingSessionDrafts!: Table<SpeakingSessionDraft, [string, string]>;
```

Append in the constructor (after the `this.version(5)` block):

```typescript
// v6: additive — two new tables for speaking recordings and in-progress session drafts.
this.version(6).stores({
  profiles: "id",
  preferences: "profileId",
  attempts: "id, [profileId+lessonId], completedAt",
  drafts: "[profileId+lessonId]",
  bookmarks: "[profileId+lessonId], profileId",
  vocab: "id, [profileId+phraseLower], [profileId+sourceLessonId], [profileId+addedAt]",
  notes: "[profileId+lessonId]",
  writingDrafts: "[profileId+lessonId]",
  writingAttempts: "id, [profileId+lessonId], completedAt",
  speakingRecordings: "id, [profileId+lessonId], completedAt",
  speakingSessionDrafts: "[profileId+lessonId]",
});
```

- [ ] **Step 4: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/types.ts src/lib/db/client.ts
git commit -m "feat: add Dexie v6 migration with speakingRecordings + speakingSessionDrafts tables"
```

---

## Task 3: DB Hooks

**Files:**
- Create: `src/lib/db/use-speaking-recordings.ts`
- Create: `src/lib/db/use-speaking-session-draft.ts`

- [ ] **Step 1: Read use-bookmarks.ts for the useLiveQuery hook pattern**

```bash
cat src/lib/db/use-bookmarks.ts
```

Expected: imports `useLiveQuery`, `useActiveProfileId`, queries by profileId.

- [ ] **Step 2: Create use-speaking-recordings.ts**

```typescript
// src/lib/db/use-speaking-recordings.ts
"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import type { SpeakingRecording } from "./types";
import { useActiveProfileId } from "./use-active-profile";

/** All recordings for a lesson, newest first. */
export function useSpeakingRecordings(lessonId: string): SpeakingRecording[] | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(
    async () => {
      const rows = await db.speakingRecordings
        .where("[profileId+lessonId]")
        .equals([profileId, lessonId])
        .toArray();
      return rows.sort((a, b) => b.completedAt - a.completedAt);
    },
    [profileId, lessonId],
  );
}

/** Map of lessonId → most recent recording, for the hub page "Learned" filter. */
export function useSpeakingRecordingsByLesson(): Map<string, SpeakingRecording> | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    const all = await db.speakingRecordings.toArray();
    const map = new Map<string, SpeakingRecording>();
    for (const row of all.filter((r) => r.profileId === profileId)) {
      const existing = map.get(row.lessonId);
      if (!existing || row.completedAt > existing.completedAt) map.set(row.lessonId, row);
    }
    return map;
  }, [profileId]);
}

export function useSaveSpeakingRecording() {
  const profileId = useActiveProfileId();
  return useCallback(
    async (input: Omit<SpeakingRecording, "id" | "profileId">) => {
      const recording: SpeakingRecording = {
        id: crypto.randomUUID(),
        profileId,
        ...input,
      };
      await db.speakingRecordings.add(recording);
      return recording;
    },
    [profileId],
  );
}

export function useDeleteSpeakingRecording() {
  return useCallback(async (id: string) => db.speakingRecordings.delete(id), []);
}
```

- [ ] **Step 3: Create use-speaking-session-draft.ts**

```typescript
// src/lib/db/use-speaking-session-draft.ts
"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import type { SpeakingSessionDraft } from "./types";
import { useActiveProfileId } from "./use-active-profile";

/** Current in-progress session draft for one lesson. Returns undefined while loading, null when absent. */
export function useSpeakingSessionDraft(lessonId: string): SpeakingSessionDraft | null | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(
    async () => (await db.speakingSessionDrafts.get([profileId, lessonId])) ?? null,
    [profileId, lessonId],
  );
}

/** Set of lessonIds with in-progress drafts, for the hub "Learning" filter. */
export function useSpeakingSessionDrafts(): Set<string> | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    const all = await db.speakingSessionDrafts.toArray();
    return new Set(all.filter((r) => r.profileId === profileId).map((r) => r.lessonId));
  }, [profileId]);
}

export function useSaveSpeakingSessionDraft() {
  const profileId = useActiveProfileId();
  return useCallback(
    async (draft: Omit<SpeakingSessionDraft, "profileId">) => {
      await db.speakingSessionDrafts.put({ profileId, ...draft });
    },
    [profileId],
  );
}

export function useDeleteSpeakingSessionDraft() {
  const profileId = useActiveProfileId();
  return useCallback(
    async (lessonId: string) => db.speakingSessionDrafts.delete([profileId, lessonId]),
    [profileId],
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/use-speaking-recordings.ts src/lib/db/use-speaking-session-draft.ts
git commit -m "feat: add DB hooks for speaking recordings and session drafts"
```

---

## Task 4: Lesson Load Hooks + Sample Data

**Files:**
- Modify: `src/lib/lessons/load.ts`
- Create: `public/lessons/speaking/index.json`
- Create: `public/lessons/speaking/a1/speaking-a1-001.json`

- [ ] **Step 1: Extend load.ts with speaking hooks**

Add these imports at the top of `src/lib/lessons/load.ts`:

```typescript
import {
  speakingLessonSchema,
  speakingLessonsIndexSchema,
} from "./speaking-schema";
import type { SpeakingLesson, SpeakingLessonMeta } from "./speaking-schema";
```

Change the `LessonKind` type:

```typescript
type LessonKind = "reading" | "listening" | "writing" | "speaking";
```

Update `parseKindAndLevel` regex to include speaking:

```typescript
function parseKindAndLevel(lessonId: string): { kind: LessonKind; level: CefrLevel } {
  const match = lessonId.match(/^(reading|listening|writing|speaking)-(a1|a2|b1|b2|c1)-/i);
  if (!match) throw new Error(`Cannot derive kind/level from lesson id: ${lessonId}`);
  return {
    kind: match[1].toLowerCase() as LessonKind,
    level: match[2].toUpperCase() as CefrLevel,
  };
}
```

Append these functions and hooks at the bottom of `load.ts`:

```typescript
async function fetchSpeakingIndex(): Promise<SpeakingLessonMeta[]> {
  const res = await fetch("/lessons/speaking/index.json");
  if (!res.ok) throw new Error("Failed to load speaking lessons index");
  return speakingLessonsIndexSchema.parse(await res.json());
}

async function fetchSpeakingLesson(lessonId: string): Promise<SpeakingLesson> {
  const { level } = parseKindAndLevel(lessonId);
  const res = await fetch(`/lessons/speaking/${level.toLowerCase()}/${lessonId}.json`);
  if (!res.ok) throw new Error(`Failed to load lesson ${lessonId}`);
  return speakingLessonSchema.parse(await res.json());
}

export function useSpeakingLessonsIndex() {
  return useQuery({
    queryKey: ["lessons", "speaking", "index"],
    queryFn: fetchSpeakingIndex,
    staleTime: Infinity,
  });
}

export function useSpeakingLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", "speaking", "lesson", lessonId],
    queryFn: () => fetchSpeakingLesson(lessonId as string),
    staleTime: Infinity,
    enabled: Boolean(lessonId),
  });
}
```

- [ ] **Step 2: Create the empty speaking index**

```json
// public/lessons/speaking/index.json
[]
```

- [ ] **Step 3: Create a sample lesson for manual testing**

```json
// public/lessons/speaking/a1/speaking-a1-001.json
{
  "id": "speaking-a1-001",
  "level": "A1",
  "title": "Ordering coffee",
  "summary": "A customer orders an iced latte at a busy café.",
  "topic": "Ordering at a café",
  "tags": ["Daily life", "Café", "Small talk"],
  "characters": ["Customer", "Barista"],
  "voices": {
    "Customer": { "sex": "female", "age": "adult", "accent": "en-US", "edgeVoice": "en-US-JennyNeural" },
    "Barista":  { "sex": "male",   "age": "adult", "accent": "en-US", "edgeVoice": "en-US-GuyNeural" }
  },
  "body": [
    { "speaker": "Customer", "text": "Hi, can I get an iced latte, please?" },
    { "speaker": "Barista",  "text": "Sure. What size?" },
    { "speaker": "Customer", "text": "Medium, please." },
    { "speaker": "Barista",  "text": "Coming right up!" }
  ],
  "sentences": [
    { "id": "s1", "speaker": "Customer", "text": "Hi, can I get an iced latte, please?" },
    { "id": "s2", "speaker": "Barista",  "text": "Sure." },
    { "id": "s3", "speaker": "Barista",  "text": "What size?" },
    { "id": "s4", "speaker": "Customer", "text": "Medium, please." },
    { "id": "s5", "speaker": "Barista",  "text": "Coming right up!" }
  ],
  "hintStarters": [
    { "id": "h1", "text": "Could I have a …, please?" },
    { "id": "h2", "text": "I'd like it …" }
  ],
  "hintVocab": [
    { "id": "v1", "phrase": "iced latte",   "meaningVi": "cà phê sữa đá kiểu Ý", "pronunciation": "/aɪst ˈlɑː.teɪ/" },
    { "id": "v2", "phrase": "coming right up", "meaningVi": "ngay đây ạ", "pronunciation": "/ˈkʌmɪŋ raɪt ʌp/" }
  ],
  "annotations": [
    { "phrase": "iced latte", "meaningVi": "cà phê sữa đá kiểu Ý", "pronunciation": "/aɪst ˈlɑː.teɪ/" }
  ],
  "grammarNotes": [
    {
      "title": "Polite requests with 'can I'",
      "bodyVi": "Dùng 'Can I …, please?' để yêu cầu lịch sự trong tiếng Anh hàng ngày.",
      "bodyEn": "Use 'Can I …, please?' for polite everyday requests."
    }
  ],
  "translationVi": "Khách: Cho tôi một ly cà phê sữa đá nhé? Nhân viên: Vâng, cỡ nào ạ? Khách: Cỡ vừa ạ. Nhân viên: Ngay đây ạ!",
  "criticalThinkingQuestion": "Why might tone matter as much as words when ordering at a café?",
  "audio": {
    "cdnBase": "https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main/speaking-a1-001",
    "manifestVersion": 1
  },
  "accents": ["en-US"]
}
```

- [ ] **Step 4: Rebuild the speaking index so it includes the sample lesson**

Edit `scripts/rebuild-indexes.mjs` — read the file first, then add this function and call after `rebuildWriting()`:

```javascript
function rebuildSpeaking() {
  const base = "public/lessons/speaking";
  if (!existsSync(base)) return 0;
  const out = [];
  for (const lvl of levels) {
    const dir = join(base, lvl);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    for (const f of files) {
      const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
      out.push({
        id: j.id,
        level: j.level,
        title: j.title,
        summary: j.summary,
        topic: j.topic,
        tags: j.tags,
        characters: j.characters,
        totalDurationMs: j.totalDurationMs,
        sentenceCount: j.sentences.length,
        turnCount: j.body.length,
      });
    }
  }
  writeFileSync(join(base, "index.json"), JSON.stringify(out, null, 2));
  return out.length;
}
```

Update the `console.log` at the bottom:

```javascript
const r = rebuildReading();
const l = rebuildListening();
const w = rebuildWriting();
const sp = rebuildSpeaking();
console.log(`wrote ${r} reading + ${l} listening + ${w} writing + ${sp} speaking index entries`);
```

Run the script:

```bash
node scripts/rebuild-indexes.mjs
```

Expected: `wrote … + 1 speaking index entries`.

- [ ] **Step 5: Add speaking to validate-lessons.mjs**

Read the file first, then add the speaking schema import and validation logic. Add to the import block:

```javascript
import {
  speakingLessonSchema,
  speakingLessonsIndexSchema,
} from "../src/lib/lessons/speaking-schema.ts";
```

In `schemaFor()`:

```javascript
function schemaFor(kind) {
  if (kind === "reading") return lessonSchema;
  if (kind === "listening") return listeningLessonSchema;
  if (kind === "speaking") return speakingLessonSchema;
  return writingLessonSchema;
}
```

In `indexSchemaFor()`:

```javascript
function indexSchemaFor(kind) {
  if (kind === "reading") return lessonsIndexSchema;
  if (kind === "listening") return listeningLessonsIndexSchema;
  if (kind === "speaking") return speakingLessonsIndexSchema;
  return writingLessonsIndexSchema;
}
```

Add `"speaking"` to the top-level `for (const kind of [...])` loop.

Also in `validateOne()`, add a speaking-specific warning (parallel to the listening one):

```javascript
if (kind === "speaking") {
  const data = parsed.data;
  const missing = data.sentences.some((s) => s.durationMs === undefined);
  if (missing || data.totalDurationMs === undefined) {
    warnings++;
    console.warn(
      `⚠ ${kind}/${lvl}/${file}: audio not generated yet — run uv run scripts/generate-audio.py --kind speaking ${data.id}`,
    );
  }
}
```

Run validation:

```bash
node scripts/validate-lessons.mjs
```

Expected: `⚠ speaking/a1/speaking-a1-001.json: audio not generated yet` (warning only, not error).

- [ ] **Step 6: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/lessons/load.ts public/lessons/speaking/ scripts/rebuild-indexes.mjs scripts/validate-lessons.mjs
git commit -m "feat: add speaking lesson load hooks, sample lesson, index rebuild + validation"
```

---

## Task 5: Hub Page + Lesson Card

**Files:**
- Create: `src/components/speaking/lesson-card.tsx`
- Create: `src/app/(app)/speaking/page.tsx`

**Reference:** `src/app/(app)/listening/page.tsx` (313 lines — clone + adapt).

- [ ] **Step 1: Read the listening hub page and listening lesson card in full**

```bash
cat src/app/\(app\)/listening/page.tsx
cat src/components/listening/lesson-card.tsx
```

- [ ] **Step 2: Create the speaking lesson card**

```tsx
// src/components/speaking/lesson-card.tsx
"use client";

import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookmarkButton } from "@/components/reading/bookmark-button";
import type { SpeakingLessonMeta } from "@/lib/lessons/speaking-schema";
import type { Highlight } from "@/lib/lessons/search-and-sort";

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

type Props = {
  lesson: SpeakingLessonMeta;
  isLearned?: boolean;
  isLearning?: boolean;
  highlight?: Highlight;
};

export function SpeakingLessonCard({ lesson, isLearned, isLearning, highlight }: Props) {
  return (
    <Link
      href={`/speaking/${lesson.id}`}
      className="group relative flex flex-col gap-2 rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="absolute right-3 top-3">
        <BookmarkButton lessonId={lesson.id} />
      </div>

      <div className="flex items-start gap-2 pr-8">
        <span className={cn("shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase", LEVEL_COLORS[lesson.level])}>
          {lesson.level}
        </span>
        <p className="line-clamp-1 text-sm font-semibold leading-snug">
          {highlight?.title ? (
            <span dangerouslySetInnerHTML={{ __html: highlight.title }} />
          ) : (
            lesson.title
          )}
        </p>
      </div>

      <p className="line-clamp-2 text-xs text-muted-foreground">
        {highlight?.summary ? (
          <span dangerouslySetInnerHTML={{ __html: highlight.summary }} />
        ) : (
          lesson.summary
        )}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3 shrink-0" aria-hidden="true" />
          {lesson.characters.join(" · ")}
        </span>
        {lesson.totalDurationMs ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3 shrink-0" aria-hidden="true" />
            {formatDuration(lesson.totalDurationMs)}
          </span>
        ) : null}
        <span>{lesson.turnCount} turns</span>
      </div>

      {(isLearned || isLearning) && (
        <div className="absolute bottom-3 right-3">
          {isLearned ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              Learned
            </span>
          ) : (
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
              Learning
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Create the hub page**

```tsx
// src/app/(app)/speaking/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSpeakingLessonsIndex } from "@/lib/lessons/load";
import { useSpeakingRecordingsByLesson } from "@/lib/db/use-speaking-recordings";
import { useSpeakingSessionDrafts } from "@/lib/db/use-speaking-session-draft";
import { useBookmarks } from "@/lib/db/use-bookmarks";
import { FilterChipRow, type ChipOption } from "@/components/reading/filter-chip-row";
import { TagFilterRow } from "@/components/reading/tag-filter-row";
import { SpeakingLessonCard } from "@/components/speaking/lesson-card";
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
import type { CefrLevel, LessonMeta } from "@/lib/lessons/types";
import type { SpeakingLessonMeta } from "@/lib/lessons/speaking-schema";

const LEVEL_OPTIONS: ChipOption[] = [
  { value: "A1", label: "A1", className: "bg-level-a1 text-level-a1-foreground" },
  { value: "A2", label: "A2", className: "bg-level-a2 text-level-a2-foreground" },
  { value: "B1", label: "B1", className: "bg-level-b1 text-level-b1-foreground" },
  { value: "B2", label: "B2", className: "bg-level-b2 text-level-b2-foreground" },
  { value: "C1", label: "C1", className: "bg-level-c1 text-level-c1-foreground" },
];

const SORT_STORAGE_KEY = "speaking:sortBy";
const STATUS_VALUES = ["learning", "learned"] as const;
type Status = (typeof STATUS_VALUES)[number];

function parseList(v: string | null): string[] { return v ? v.split(",").filter(Boolean) : []; }
function parseStatus(v: string | null): Status | null {
  return v && (STATUS_VALUES as readonly string[]).includes(v) ? (v as Status) : null;
}

function SpeakingHubContent() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedLevels = parseList(params.get("levels"));
  const selectedTags = parseList(params.get("tags"));
  const favoritesOnly = params.get("favorites") === "1";
  const status = parseStatus(params.get("status"));

  const { data: lessons, isLoading } = useSpeakingLessonsIndex();
  const recordingsByLesson = useSpeakingRecordingsByLesson();
  const sessionDrafts = useSpeakingSessionDrafts();
  const bookmarks = useBookmarks();

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useLocalStorageString<SortBy>(SORT_STORAGE_KEY, "name", SORT_OPTIONS);
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 0xffffffff));

  const levelsKey = selectedLevels.join(",");
  const tagsKey = selectedTags.join(",");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRandomSeed(Math.floor(Math.random() * 0xffffffff));
  }, [levelsKey, tagsKey, favoritesOnly, status]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    lessons?.forEach((l) => l.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return counts;
  }, [lessons]);

  const filtered = useMemo(() => {
    if (!lessons) return [];
    return lessons.filter((l) => {
      if (selectedLevels.length && !selectedLevels.includes(l.level)) return false;
      if (selectedTags.length && !selectedTags.some((t) => l.tags.includes(t))) return false;
      if (favoritesOnly && !bookmarks?.has(l.id)) return false;
      if (status === "learned" && !recordingsByLesson?.has(l.id)) return false;
      if (status === "learning" && !sessionDrafts?.has(l.id)) return false;
      return true;
    });
  }, [lessons, selectedLevels, selectedTags, favoritesOnly, bookmarks, status, recordingsByLesson, sessionDrafts]);

  const filteredMeta = filtered as LessonMeta[];
  const fuse = useMemo(() => buildFuse(filteredMeta), [filteredMeta]);
  const { items: searchedMeta, highlights } = useMemo(
    () => searchWithHighlights(filteredMeta, query, fuse),
    [filteredMeta, query, fuse],
  );
  const isSearching = query.trim().length > 0;
  const display = useMemo(() => {
    const sorted = isSearching && sortBy === "random" ? searchedMeta : sortLessons(searchedMeta, sortBy, randomSeed);
    return sorted as SpeakingLessonMeta[];
  }, [searchedMeta, sortBy, randomSeed, isSearching]);

  const completedCount = recordingsByLesson?.size ?? 0;

  function setParam(key: "levels" | "tags", next: string[]) {
    const sp = new URLSearchParams(params.toString());
    if (next.length === 0) sp.delete(key); else sp.set(key, next.join(","));
    router.replace(`/speaking?${sp.toString()}`);
  }
  function toggleFavorites() {
    const sp = new URLSearchParams(params.toString());
    if (favoritesOnly) sp.delete("favorites"); else sp.set("favorites", "1");
    router.replace(`/speaking?${sp.toString()}`);
  }
  function setStatus(next: Status | null) {
    const sp = new URLSearchParams(params.toString());
    if (next === null) sp.delete("status"); else sp.set("status", next);
    router.replace(`/speaking?${sp.toString()}`);
  }
  function clearAllFilters() {
    setQuery("");
    router.replace("/speaking");
  }

  const hasActiveFilters = selectedLevels.length > 0 || selectedTags.length > 0 || favoritesOnly || status !== null || isSearching;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pl-12 md:pl-0">
        <h1 className="text-lg font-semibold sm:text-xl">Speaking lessons</h1>
        <p className="text-xs text-muted-foreground">{completedCount} / {lessons?.length ?? 0} completed</p>
      </header>
      <div className="mb-3"><LessonSearch value={query} onChange={setQuery} /></div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FilterChipRow label="Level" options={LEVEL_OPTIONS} selected={selectedLevels} onChange={(next) => setParam("levels", next as CefrLevel[])} />
        <button type="button" onClick={toggleFavorites} aria-pressed={favoritesOnly}
          className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            favoritesOnly ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300" : "border-border text-muted-foreground hover:bg-accent")}>
          <Star className={cn("size-3", favoritesOnly && "fill-amber-400 stroke-amber-500")} aria-hidden="true" />
          Favorites
        </button>
        <button type="button" onClick={() => setStatus(status === "learning" ? null : "learning")} aria-pressed={status === "learning"}
          className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            status === "learning" ? "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300" : "border-border text-muted-foreground hover:bg-accent")}>
          Learning
        </button>
        <button type="button" onClick={() => setStatus(status === "learned" ? null : "learned")} aria-pressed={status === "learned"}
          className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            status === "learned" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border-border text-muted-foreground hover:bg-accent")}>
          Learned
        </button>
        <div className="ml-auto"><SortSelect value={sortBy} onChange={setSortBy} /></div>
      </div>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex-1">
          <TagFilterRow tagCounts={tagCounts} selected={selectedTags} onChange={(next) => setParam("tags", next)} />
        </div>
        {hasActiveFilters && (
          <button type="button" onClick={clearAllFilters} className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline">
            Clear filters
          </button>
        )}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : display.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {isSearching ? "No lessons match your search." : hasActiveFilters ? "No lessons match these filters." : "No speaking lessons yet"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {display.map((lesson) => (
            <SpeakingLessonCard
              key={lesson.id}
              lesson={lesson}
              isLearned={recordingsByLesson?.has(lesson.id)}
              isLearning={!recordingsByLesson?.has(lesson.id) && sessionDrafts?.has(lesson.id)}
              highlight={highlights.get(lesson.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpeakingHubPage() {
  return <Suspense><SpeakingHubContent /></Suspense>;
}
```

- [ ] **Step 4: Remove `comingSoon: true` from Speaking nav entry**

In `src/components/app-shell/nav-config.ts`, change:

```typescript
{ href: "/speaking",  label: "Speaking",  icon: Mic,        comingSoon: true },
```

to:

```typescript
{ href: "/speaking",  label: "Speaking",  icon: Mic },
```

- [ ] **Step 5: Start the dev server and verify the hub page renders**

```bash
npm run dev
```

Open `http://localhost:3000/speaking`. Expected: hub page with filters, empty grid ("No speaking lessons yet"). The sidebar shows "Speaking" as a clickable link (no "Coming soon" badge).

Re-run the index rebuild so the sample lesson appears:

```bash
node scripts/rebuild-indexes.mjs
```

Reload the page. Expected: one lesson card showing "speaking-a1-001 / Ordering coffee / Customer · Barista / 4 turns".

- [ ] **Step 6: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/components/speaking/lesson-card.tsx src/app/\(app\)/speaking/page.tsx src/components/app-shell/nav-config.ts
git commit -m "feat: add speaking hub page, lesson card, remove comingSoon from nav"
```

---

## Task 6: Audio Recorder

**Files:**
- Create: `src/lib/audio/recorder.ts`

- [ ] **Step 1: Write the recorder module**

```typescript
// src/lib/audio/recorder.ts

export interface RecorderHandle {
  start(): Promise<void>;
  stop(): void;
  getRmsLevel(): number; // 0–1, poll each animation frame
  dispose(): void;
  onStop?: (blob: Blob) => void;
}

export function createRecorder(opts: { expectedDurationMs: number }): RecorderHandle {
  const hardCapMs = Math.max(8000, opts.expectedDurationMs * 2.5);

  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: BlobPart[] = [];
  let rmsLevel = 0;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let hardCapTimer: ReturnType<typeof setTimeout> | null = null;
  let speechDetected = false;
  let silentTicks = 0;
  let stopped = false;

  const handle: RecorderHandle = {
    onStop: undefined,

    async start() {
      stopped = false;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      audioCtx.createMediaStreamSource(stream).connect(analyser);

      // Calibrate noise floor over 500ms (5 × 100ms samples)
      const noiseSamples: number[] = [];
      await new Promise<void>((resolve) => {
        let n = 0;
        const cal = setInterval(() => {
          const buf = new Float32Array(analyser!.fftSize);
          analyser!.getFloatTimeDomainData(buf);
          noiseSamples.push(Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length));
          if (++n >= 5) { clearInterval(cal); resolve(); }
        }, 100);
      });
      const noiseRms = noiseSamples.reduce((s, v) => s + v, 0) / noiseSamples.length;
      const threshold = noiseRms * 4; // 12 dB ≈ ×4 linear

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      chunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        handle.onStop?.(blob);
      };
      mediaRecorder.start(100);

      speechDetected = false;
      silentTicks = 0;

      hardCapTimer = setTimeout(() => handle.stop(), hardCapMs);

      const buf = new Float32Array(analyser.fftSize);
      pollTimer = setInterval(() => {
        if (!analyser) return;
        analyser.getFloatTimeDomainData(buf);
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
        // Normalize to 0–1 relative to 2× threshold for visualizer
        rmsLevel = Math.min(1, rms / (threshold * 2 || 0.001));

        if (rms > threshold) {
          speechDetected = true;
          silentTicks = 0;
        } else if (speechDetected) {
          if (++silentTicks >= 30) handle.stop(); // 30 × 100ms = 3000ms silence
        }
      }, 100);
    },

    stop() {
      if (stopped) return;
      stopped = true;
      if (pollTimer)    { clearInterval(pollTimer);   pollTimer = null; }
      if (hardCapTimer) { clearTimeout(hardCapTimer);  hardCapTimer = null; }
      if (mediaRecorder?.state !== "inactive") mediaRecorder?.stop();
    },

    getRmsLevel() { return rmsLevel; },

    dispose() {
      handle.stop();
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
      audioCtx = null; analyser = null; stream = null; mediaRecorder = null;
    },
  };

  return handle;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/audio/recorder.ts
git commit -m "feat: add audio recorder with silence detection and RMS level"
```

---

## Task 7: LameWorker + Mixer

**Files:**
- Create: `src/lib/audio/lame-worker.ts`
- Create: `src/lib/audio/mixer.ts`

- [ ] **Step 1: Install lamejs**

```bash
npm install lamejs
```

Check if @types/lamejs exists:

```bash
npm install --save-dev @types/lamejs 2>/dev/null || echo "no @types/lamejs"
```

If no `@types/lamejs`, create a type declaration. Check if needed:

```bash
npx tsc --noEmit 2>&1 | grep lamejs
```

If TypeScript complains, create `src/lib/audio/lamejs.d.ts`:

```typescript
// src/lib/audio/lamejs.d.ts
declare module "lamejs" {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
    flush(): Int8Array;
  }
}
```

- [ ] **Step 2: Write the lame worker**

```typescript
// src/lib/audio/lame-worker.ts
/// <reference lib="webworker" />
import { Mp3Encoder } from "lamejs";

const BLOCK_SIZE = 1152;

self.onmessage = (e: MessageEvent<{ pcm: Float32Array; sampleRate: number }>) => {
  const { pcm, sampleRate } = e.data;
  const encoder = new Mp3Encoder(1, sampleRate, 128);

  // Convert Float32 (−1..1) → Int16 (−32768..32767)
  const int16 = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767)));
  }

  const mp3Chunks: Uint8Array[] = [];
  for (let i = 0; i < int16.length; i += BLOCK_SIZE) {
    const chunk = int16.subarray(i, Math.min(i + BLOCK_SIZE, int16.length));
    const encoded = encoder.encodeBuffer(chunk);
    if (encoded.length > 0) mp3Chunks.push(new Uint8Array(encoded));
  }
  const flushed = encoder.flush();
  if (flushed.length > 0) mp3Chunks.push(new Uint8Array(flushed));

  const total = mp3Chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of mp3Chunks) { result.set(chunk, offset); offset += chunk.length; }

  self.postMessage({ mp3: result }, [result.buffer]);
};
```

- [ ] **Step 3: Write the mixer**

```typescript
// src/lib/audio/mixer.ts

export type MixChunk = { kind: "system" | "user"; blob: Blob };

export async function mixToMp3(chunks: MixChunk[]): Promise<Blob> {
  if (chunks.length === 0) throw new Error("mixToMp3: no chunks provided");

  // Decode all blobs at 44100 Hz (AudioContext resamples automatically)
  const ac = new AudioContext({ sampleRate: 44100 });
  const buffers: AudioBuffer[] = await Promise.all(
    chunks.map(async (c) => {
      const ab = await c.blob.arrayBuffer();
      return ac.decodeAudioData(ab);
    }),
  );
  await ac.close();

  const GAP = Math.round(0.3 * 44100); // 300ms silence
  const totalSamples = buffers.reduce((s, b) => s + b.length, 0) + GAP * (buffers.length - 1);
  const output = new Float32Array(totalSamples); // zero-filled = silence

  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    // Downmix to mono
    const mono = new Float32Array(buf.length);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const data = buf.getChannelData(ch);
      for (let j = 0; j < data.length; j++) mono[j] += data[j] / buf.numberOfChannels;
    }
    output.set(mono, offset);
    offset += mono.length;
    if (i < buffers.length - 1) offset += GAP; // silence gap (already zeroed)
  }

  const mp3Buffer = await encodeWithWorker(output, 44100);
  return new Blob([mp3Buffer], { type: "audio/mpeg" });
}

function encodeWithWorker(pcm: Float32Array, sampleRate: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./lame-worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ mp3: Uint8Array }>) => {
      resolve(e.data.mp3.buffer);
      worker.terminate();
    };
    worker.onerror = (e) => {
      reject(new Error(e.message ?? "lame-worker error"));
      worker.terminate();
    };
    worker.postMessage({ pcm, sampleRate }, [pcm.buffer]);
  });
}
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio/lame-worker.ts src/lib/audio/mixer.ts package.json package-lock.json
git commit -m "feat: add lamejs Web Worker and MP3 mixer"
```

---

## Task 8: Listen Tab Wrapper

**Files:**
- Create: `src/components/speaking/sample-listen-tab.tsx`

**Context:** The Listen tab reuses `TranscriptPlayer` from listening. Key insight: for speaking, sentence URLs are `{cdnBase}/sentences/{sentenceId}.mp3`, but the listening store generates `${cdnBase}/${sentenceId}.mp3`. Passing `{lesson.audio.cdnBase}/sentences` as `cdnBase` to the store resolves to the correct URL.

- [ ] **Step 1: Read the listening detail page to understand audio store initialization**

```bash
cat src/app/\(app\)/listening/\[lessonId\]/page.tsx
```

Note the `loadAudio()` call signature and what fields it receives.

- [ ] **Step 2: Read the listening audio store**

```bash
cat src/stores/listening-audio-store.ts
```

Note the `load` action signature.

- [ ] **Step 3: Write the Listen tab wrapper**

The `SampleListenTab` initializes the listening audio store with `cdnBase` pointing to the `/sentences` subdirectory, so TranscriptPlayer URLs resolve correctly.

```tsx
// src/components/speaking/sample-listen-tab.tsx
"use client";

import { useEffect } from "react";
import { TranscriptPlayer } from "@/components/listening/transcript-player";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import type { SpeakingLesson } from "@/lib/lessons/speaking-schema";

type Props = { lesson: SpeakingLesson };

export function SampleListenTab({ lesson }: Props) {
  const load = useListeningAudioStore((s) => s.load);
  const stop = useListeningAudioStore((s) => s.stop);

  useEffect(() => {
    // Sentence URLs: {cdnBase}/sentences/{sentenceId}.mp3
    // The store generates: ${cdnBase}/${sentenceId}.mp3
    // So we pass cdnBase + "/sentences" to get the correct path.
    load({
      lessonId: lesson.id,
      cdnBase: `${lesson.audio.cdnBase}/sentences`,
      sentences: lesson.sentences,
      manifestVersion: lesson.audio.manifestVersion,
    });
    return () => stop();
  }, [lesson.id, lesson.audio.cdnBase, lesson.audio.manifestVersion, load, stop]);

  return (
    <div className="space-y-4">
      <TranscriptPlayer />
      {/* Transcript display with speaker labels — adapt the listening Transcript component */}
      {/* Translation panel */}
      {lesson.translationVi && (
        <details className="rounded-md border">
          <summary className="cursor-pointer px-4 py-2 text-sm font-medium">Vietnamese translation</summary>
          <p className="px-4 pb-3 pt-1 text-sm text-muted-foreground">{lesson.translationVi}</p>
        </details>
      )}
      {/* Grammar notes */}
      {lesson.grammarNotes.length > 0 && (
        <div className="space-y-2">
          {lesson.grammarNotes.map((note, i) => (
            <details key={i} className="rounded-md border">
              <summary className="cursor-pointer px-4 py-2 text-sm font-medium">{note.title}</summary>
              <div className="px-4 pb-3 pt-1 text-sm">
                <p className="text-muted-foreground">{note.bodyVi}</p>
                <p className="mt-1">{note.bodyEn}</p>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Note:** If the listening audio store's `load` action has a different signature from what's shown here, read the store file and adjust the call accordingly. The `sentences` field must match the store's expected type (it uses `ListeningLesson.sentences` normally — `SpeakingLesson.sentences` has identical shape).

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/speaking/sample-listen-tab.tsx
git commit -m "feat: add Listen tab wrapper using TranscriptPlayer with speaking CDN URL mapping"
```

---

## Task 9: Voice Visualizer + Recorder Button

**Files:**
- Create: `src/components/speaking/voice-visualizer.tsx`
- Create: `src/components/speaking/recorder-button.tsx`

- [ ] **Step 1: Write the voice visualizer (animated RMS bars)**

```tsx
// src/components/speaking/voice-visualizer.tsx
"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = { getRmsLevel: () => number; active: boolean; className?: string };

const NUM_BARS = 5;

export function VoiceVisualizer({ getRmsLevel, active, className }: Props) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!active) {
      barsRef.current.forEach((b) => { if (b) b.style.transform = "scaleY(0.15)"; });
      return;
    }
    let rafId: number;
    const animate = () => {
      const level = getRmsLevel();
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const wave = Math.sin(Date.now() / 150 + i * 0.8) * 0.2;
        const scale = Math.max(0.15, Math.min(1, level * 0.9 + wave * level + 0.1));
        bar.style.transform = `scaleY(${scale})`;
      });
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [active, getRmsLevel]);

  return (
    <div className={cn("flex items-center gap-[3px]", className)} aria-hidden="true">
      {Array.from({ length: NUM_BARS }, (_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className="w-1 rounded-full bg-primary transition-transform duration-75"
          style={{ height: "1.5rem", transform: "scaleY(0.15)", transformOrigin: "center" }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write the recorder button**

```tsx
// src/components/speaking/recorder-button.tsx
"use client";

import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type RecorderState = "idle" | "recording" | "recorded";

type Props = {
  state: RecorderState;
  onRecord: () => void;
  onStop: () => void;
  disabled?: boolean;
};

export function RecorderButton({ state, onRecord, onStop, disabled }: Props) {
  if (state === "recording") {
    return (
      <button
        type="button"
        onClick={onStop}
        className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-red-600 active:scale-95"
      >
        <Square className="size-3.5 fill-white" aria-hidden="true" />
        Stop
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onRecord}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-colors",
        state === "recorded"
          ? "border bg-background hover:bg-accent"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Mic className="size-3.5" aria-hidden="true" />
      {state === "recorded" ? "Re-record" : "Record"}
    </button>
  );
}
```

- [ ] **Step 3: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/speaking/voice-visualizer.tsx src/components/speaking/recorder-button.tsx
git commit -m "feat: add VoiceVisualizer and RecorderButton components"
```

---

## Task 10: Turn Row

**Files:**
- Create: `src/components/speaking/turn-row.tsx`

A `TurnRow` renders one dialogue turn. System turns auto-play and show a waveform bar. User turns show record controls.

- [ ] **Step 1: Write turn-row.tsx**

```tsx
// src/components/speaking/turn-row.tsx
"use client";

import { Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecorderButton } from "./recorder-button";
import { VoiceVisualizer } from "./voice-visualizer";
import type { SpeakingSentence } from "@/lib/lessons/speaking-schema";

type TurnState =
  | "upcoming"
  | "system-playing"
  | "user-idle"
  | "user-recording"
  | "user-recorded"
  | "done";

type Props = {
  turnIndex: number;
  speaker: string;
  text: string;
  isUser: boolean;
  state: TurnState;
  onRecord: () => void;
  onStopRecording: () => void;
  onPlayback: () => void;
  onContinue: () => void;
  onPlayModel: () => void;
  getRmsLevel: () => number;
  hasBlob: boolean;
};

export function TurnRow({
  turnIndex,
  speaker,
  text,
  isUser,
  state,
  onRecord,
  onStopRecording,
  onPlayback,
  onContinue,
  onPlayModel,
  getRmsLevel,
  hasBlob,
}: Props) {
  const isActive = state !== "upcoming" && state !== "done";
  const isDone = state === "done";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all",
        isActive && "border-primary/40 bg-primary/5 shadow-sm",
        isDone && "opacity-60",
        state === "upcoming" && "opacity-40",
        isUser ? "ml-8" : "mr-8",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">{isUser ? "🙋" : "🧑‍💼"}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{speaker}</span>
        {isDone && <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400">✓</span>}
      </div>

      <p className="mb-3 text-sm leading-relaxed">{text}</p>

      {isActive && (
        <div className="flex flex-wrap items-center gap-2">
          {!isUser && state === "system-playing" && (
            <VoiceVisualizer getRmsLevel={() => 0.5} active className="mr-2" />
          )}

          {isUser && (
            <>
              <button
                type="button"
                onClick={onPlayModel}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
              >
                <Play className="size-3 fill-current" aria-hidden="true" />
                Play model
              </button>

              <RecorderButton
                state={
                  state === "user-recording" ? "recording"
                  : hasBlob ? "recorded"
                  : "idle"
                }
                onRecord={onRecord}
                onStop={onStopRecording}
              />

              {state === "user-recording" && (
                <VoiceVisualizer getRmsLevel={getRmsLevel} active />
              )}

              {hasBlob && state !== "user-recording" && (
                <>
                  <button
                    type="button"
                    onClick={onPlayback}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                  >
                    <Play className="size-3 fill-current" aria-hidden="true" />
                    Play back
                  </button>
                  <button
                    type="button"
                    onClick={onContinue}
                    className="ml-auto rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Continue →
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/speaking/turn-row.tsx
git commit -m "feat: add TurnRow component for dialogue turns"
```

---

## Task 11: Hint Panel

**Files:**
- Create: `src/components/speaking/hint-panel.tsx`

The hint panel is a 320px sidebar showing vocab, starters, and grammar notes with audio play buttons.

- [ ] **Step 1: Write hint-panel.tsx**

```tsx
// src/components/speaking/hint-panel.tsx
"use client";

import { Play } from "lucide-react";
import type { SpeakingLesson } from "@/lib/lessons/speaking-schema";

function playAudio(url: string) {
  new Audio(url).play().catch(console.error);
}

type Props = { lesson: SpeakingLesson };

export function HintPanel({ lesson }: Props) {
  const { audio, hintVocab, hintStarters, grammarNotes } = lesson;

  return (
    <div className="space-y-6">
      {/* Hint vocab */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Key vocabulary
        </h3>
        <ul className="space-y-2">
          {hintVocab.map((v) => (
            <li key={v.id} className="flex items-start gap-2 rounded-md border p-2">
              <button
                type="button"
                aria-label={`Play pronunciation of ${v.phrase}`}
                onClick={() => playAudio(`${audio.cdnBase}/vocab/${v.id}.mp3`)}
                className="mt-0.5 shrink-0 rounded-full p-1 hover:bg-accent"
              >
                <Play className="size-3 fill-current" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium">{v.phrase}</p>
                <p className="text-xs text-muted-foreground">{v.pronunciation}</p>
                <p className="text-xs text-muted-foreground">{v.meaningVi}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Hint starters */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Conversation starters
        </h3>
        <ul className="space-y-2">
          {hintStarters.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-md border p-2">
              <button
                type="button"
                aria-label={`Play starter: ${s.text}`}
                onClick={() => playAudio(`${audio.cdnBase}/starters/${s.id}.mp3`)}
                className="shrink-0 rounded-full p-1 hover:bg-accent"
              >
                <Play className="size-3 fill-current" aria-hidden="true" />
              </button>
              <p className="text-sm">{s.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Grammar notes */}
      {grammarNotes.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Grammar notes
          </h3>
          <div className="space-y-2">
            {grammarNotes.map((note, i) => (
              <details key={i} className="rounded-md border">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium">{note.title}</summary>
                <div className="px-3 pb-3 pt-1 text-xs">
                  <p className="text-muted-foreground">{note.bodyVi}</p>
                  <p className="mt-1">{note.bodyEn}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Compile check + commit**

```bash
npx tsc --noEmit
git add src/components/speaking/hint-panel.tsx
git commit -m "feat: add HintPanel sidebar component"
```

---

## Task 12: Mix Result Card + Recordings History

**Files:**
- Create: `src/components/speaking/mix-result-card.tsx`
- Create: `src/components/speaking/recordings-history.tsx`

- [ ] **Step 1: Write mix-result-card.tsx**

Shown after Mix & Save completes. Displays inline `<audio>` player, duration, and download button.

```tsx
// src/components/speaking/mix-result-card.tsx
"use client";

import { useEffect, useRef } from "react";
import { Download } from "lucide-react";

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

type Props = {
  mp3Blob: Blob;
  durationMs: number;
  lessonTitle: string;
  criticalThinkingQuestion?: string;
};

export function MixResultCard({ mp3Blob, durationMs, lessonTitle, criticalThinkingQuestion }: Props) {
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(mp3Blob);
    urlRef.current = url;
    return () => URL.revokeObjectURL(url);
  }, [mp3Blob]);

  function handleDownload() {
    const url = urlRef.current;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lessonTitle.replace(/\s+/g, "-").toLowerCase()}-practice.mp3`;
    a.click();
  }

  return (
    <div className="rounded-lg border bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">
          ✓ Saved to My recordings
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{formatDuration(durationMs)}</span>
      </div>

      {urlRef.current && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls src={urlRef.current} className="w-full" />
      )}

      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
      >
        <Download className="size-4" aria-hidden="true" />
        Download .mp3
      </button>

      {criticalThinkingQuestion && (
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Think about it</p>
          <p className="text-sm">{criticalThinkingQuestion}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write recordings-history.tsx**

```tsx
// src/components/speaking/recordings-history.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Play, Trash2 } from "lucide-react";
import {
  useSpeakingRecordings,
  useDeleteSpeakingRecording,
} from "@/lib/db/use-speaking-recordings";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function RecordingRow({ rec, lessonTitle }: { rec: { id: string; role: string; completedAt: number; durationMs: number; mp3Blob: Blob }; lessonTitle: string }) {
  const deleteRecording = useDeleteSpeakingRecording();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(rec.mp3Blob);
    urlRef.current = url;
    return () => URL.revokeObjectURL(url);
  }, [rec.mp3Blob]);

  function handlePlay() {
    if (!urlRef.current) return;
    if (!audioRef.current) audioRef.current = new Audio(urlRef.current);
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setPlaying(true);
      audioRef.current.onended = () => setPlaying(false);
    }
  }

  function handleDownload() {
    if (!urlRef.current) return;
    const a = document.createElement("a");
    a.href = urlRef.current;
    a.download = `${lessonTitle.replace(/\s+/g, "-").toLowerCase()}-${rec.role}-${rec.completedAt}.mp3`;
    a.click();
  }

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">As {rec.role}</p>
        <p className="text-xs text-muted-foreground">{formatDate(rec.completedAt)} · {formatDuration(rec.durationMs)}</p>
      </div>
      <button type="button" onClick={handlePlay} aria-label={playing ? "Pause" : "Play"} className="shrink-0 rounded-full p-1.5 hover:bg-accent">
        <Play className="size-4 fill-current" aria-hidden="true" />
      </button>
      <button type="button" onClick={handleDownload} aria-label="Download" className="shrink-0 rounded-full p-1.5 hover:bg-accent">
        <Download className="size-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={() => deleteRecording(rec.id)} aria-label="Delete recording" className="shrink-0 rounded-full p-1.5 text-destructive hover:bg-destructive/10">
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

type Props = { lessonId: string; lessonTitle: string };

export function RecordingsHistory({ lessonId, lessonTitle }: Props) {
  const recordings = useSpeakingRecordings(lessonId);

  if (!recordings || recordings.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-semibold">My recordings</h2>
      <div className="space-y-2">
        {recordings.map((rec) => (
          <RecordingRow key={rec.id} rec={rec} lessonTitle={lessonTitle} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Compile check + commit**

```bash
npx tsc --noEmit
git add src/components/speaking/mix-result-card.tsx src/components/speaking/recordings-history.tsx
git commit -m "feat: add MixResultCard and RecordingsHistory components"
```

---

## Task 13: Practice Session State Machine

**Files:**
- Create: `src/components/speaking/practice-session.tsx`

This is the largest component. It owns the full Practice tab state machine.

**State machine:**
```
idle → in_session(turnIndex) → done → mixing → mixed
```

**Body turn mapping:** A helper maps each body turn index to its sentences for audio playback.

- [ ] **Step 1: Write a utility to map body turns to sentences**

This goes at the top of `practice-session.tsx` (not exported):

```typescript
function buildTurnSentences(lesson: SpeakingLesson): Map<number, SpeakingSentence[]> {
  const map = new Map<number, SpeakingSentence[]>();
  let si = 0;
  for (let bi = 0; bi < lesson.body.length; bi++) {
    const turn = lesson.body[bi];
    const turnSentences: SpeakingSentence[] = [];
    const accumulated: string[] = [];
    while (si < lesson.sentences.length && lesson.sentences[si].speaker === turn.speaker) {
      accumulated.push(lesson.sentences[si].text);
      turnSentences.push(lesson.sentences[si]);
      si++;
      if (accumulated.join(" ").trim() === turn.text.trim()) break;
    }
    map.set(bi, turnSentences);
  }
  return map;
}

function turnExpectedDurationMs(sentences: SpeakingSentence[]): number {
  return sentences.reduce((s, sent) => s + (sent.durationMs ?? 2000), 0);
}
```

- [ ] **Step 2: Write the full practice-session.tsx**

```tsx
// src/components/speaking/practice-session.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { TurnRow } from "./turn-row";
import { MixResultCard } from "./mix-result-card";
import { mixToMp3, type MixChunk } from "@/lib/audio/mixer";
import { createRecorder, type RecorderHandle } from "@/lib/audio/recorder";
import { useSaveSpeakingRecording } from "@/lib/db/use-speaking-recordings";
import { useSaveSpeakingSessionDraft, useDeleteSpeakingSessionDraft, useSpeakingSessionDraft } from "@/lib/db/use-speaking-session-draft";
import type { SpeakingLesson, SpeakingSentence } from "@/lib/lessons/speaking-schema";

// ── Helpers ────────────────────────────────────────────────────────────────

function buildTurnSentences(lesson: SpeakingLesson): Map<number, SpeakingSentence[]> {
  const map = new Map<number, SpeakingSentence[]>();
  let si = 0;
  for (let bi = 0; bi < lesson.body.length; bi++) {
    const turn = lesson.body[bi];
    const group: SpeakingSentence[] = [];
    const acc: string[] = [];
    while (si < lesson.sentences.length && lesson.sentences[si].speaker === turn.speaker) {
      acc.push(lesson.sentences[si].text);
      group.push(lesson.sentences[si]);
      si++;
      if (acc.join(" ").trim() === turn.text.trim()) break;
    }
    map.set(bi, group);
  }
  return map;
}

function expectedMs(sentences: SpeakingSentence[]): number {
  return sentences.reduce((s, sent) => s + (sent.durationMs ?? 2000), 0);
}

async function playSequential(sentences: SpeakingSentence[], cdnBase: string): Promise<void> {
  for (const s of sentences) {
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(`${cdnBase}/sentences/${s.id}.mp3`);
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error(`Failed to play ${s.id}`));
      audio.play().catch(reject);
    });
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = "idle" | "in_session" | "done" | "mixing" | "mixed";

type Props = { lesson: SpeakingLesson; role: string };

// ── Component ─────────────────────────────────────────────────────────────

export function PracticeSession({ lesson, role }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [turnIndex, setTurnIndex] = useState(0);
  const [turnBlobs, setTurnBlobs] = useState<Map<number, Blob>>(new Map());
  const [mixedBlob, setMixedBlob] = useState<Blob | null>(null);
  const [mixedDurationMs, setMixedDurationMs] = useState(0);
  const [mixError, setMixError] = useState<string | null>(null);
  const [rmsLevel, setRmsLevel] = useState(0);

  const recorderRef = useRef<RecorderHandle | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveRecording = useSaveSpeakingRecording();
  const saveDraft = useSaveSpeakingSessionDraft();
  const deleteDraft = useDeleteSpeakingSessionDraft();
  const draft = useSpeakingSessionDraft(lesson.id);

  const turnSentences = useMemo(() => buildTurnSentences(lesson), [lesson]);
  const totalTurns = lesson.body.length;

  // Restore from draft on mount
  useEffect(() => {
    if (draft && phase === "idle") {
      const restored = new Map(
        Object.entries(draft.turnBlobs).map(([k, v]) => [Number(k), v]),
      );
      setTurnBlobs(restored);
      const nextTurn = [...restored.keys()].reduce((max, k) => Math.max(max, k), -1) + 1;
      if (nextTurn >= totalTurns) {
        setTurnIndex(totalTurns - 1);
        setPhase("done");
      } else {
        setTurnIndex(nextTurn);
        setPhase("in_session");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Persist draft whenever turn blobs change
  useEffect(() => {
    if (turnBlobs.size === 0) return;
    saveDraft({
      lessonId: lesson.id,
      role,
      turnBlobs: Object.fromEntries(turnBlobs),
      updatedAt: Date.now(),
    });
  }, [turnBlobs, lesson.id, role, saveDraft]);

  // Auto-play system turns when they become active
  useEffect(() => {
    if (phase !== "in_session") return;
    const turn = lesson.body[turnIndex];
    if (turn.speaker === role) return; // user turn — don't auto-play

    const sentences = turnSentences.get(turnIndex) ?? [];
    playSequential(sentences, lesson.audio.cdnBase).then(() => {
      advanceTurn();
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turnIndex, role]);

  function advanceTurn() {
    const next = turnIndex + 1;
    if (next >= totalTurns) {
      setPhase("done");
    } else {
      setTurnIndex(next);
    }
  }

  function startSession() {
    setTurnIndex(0);
    setPhase("in_session");
  }

  function restartSession() {
    if (!confirm("Clear all recorded turns and restart?")) return;
    recorderRef.current?.dispose();
    recorderRef.current = null;
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setTurnBlobs(new Map());
    setPhase("idle");
    setTurnIndex(0);
    setMixedBlob(null);
    deleteDraft(lesson.id);
  }

  function handleRecord(bi: number) {
    const sentences = turnSentences.get(bi) ?? [];
    const dur = expectedMs(sentences);
    const recorder = createRecorder({ expectedDurationMs: dur });
    recorder.onStop = (blob) => {
      setTurnBlobs((prev) => new Map(prev).set(bi, blob));
      // Auto-advance after 2s unless user clicks Continue first
      autoAdvanceRef.current = setTimeout(() => handleContinue(bi), 2000);
    };
    recorderRef.current = recorder;
    recorder.start().catch((err) => console.error("Recorder start failed:", err));
    // Poll RMS for visualizer
    const poll = setInterval(() => setRmsLevel(recorder.getRmsLevel()), 80);
    recorder.onStop = (blob) => {
      clearInterval(poll);
      setRmsLevel(0);
      setTurnBlobs((prev) => new Map(prev).set(bi, blob));
      autoAdvanceRef.current = setTimeout(() => handleContinue(bi), 2000);
    };
  }

  function handleStopRecording() {
    recorderRef.current?.stop();
  }

  function handlePlayback(bi: number) {
    const blob = turnBlobs.get(bi);
    if (!blob) return;
    new Audio(URL.createObjectURL(blob)).play().catch(console.error);
  }

  function handleContinue(bi: number) {
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    recorderRef.current?.dispose();
    recorderRef.current = null;
    const next = bi + 1;
    if (next >= totalTurns) setPhase("done");
    else setTurnIndex(next);
  }

  function handlePlayModel(bi: number) {
    const sentences = turnSentences.get(bi) ?? [];
    playSequential(sentences, lesson.audio.cdnBase).catch(console.error);
  }

  async function handleMix() {
    setPhase("mixing");
    setMixError(null);
    try {
      const chunks: MixChunk[] = [];
      for (let bi = 0; bi < totalTurns; bi++) {
        const sentences = turnSentences.get(bi) ?? [];
        if (lesson.body[bi].speaker === role) {
          const blob = turnBlobs.get(bi);
          if (blob) chunks.push({ kind: "user", blob });
        } else {
          for (const s of sentences) {
            const res = await fetch(`${lesson.audio.cdnBase}/sentences/${s.id}.mp3`);
            chunks.push({ kind: "system", blob: await res.blob() });
          }
        }
      }
      const mp3 = await mixToMp3(chunks);
      const durMs = Math.round(mp3.size / (128 * 1000 / 8) * 1000); // approximate from bitrate
      const recording = await saveRecording({
        lessonId: lesson.id,
        role,
        completedAt: Date.now(),
        durationMs: durMs,
        turnCount: totalTurns,
        mp3Blob: mp3,
      });
      await deleteDraft(lesson.id);
      setMixedBlob(mp3);
      setMixedDurationMs(durMs);
      setPhase("mixed");
    } catch (err) {
      console.error("Mix failed:", err);
      setMixError(err instanceof Error ? err.message : "Mix failed");
      setPhase("done");
    }
  }

  function getTurnState(bi: number) {
    if (phase === "idle") return "upcoming";
    if (phase === "done" || phase === "mixing" || phase === "mixed") {
      return turnBlobs.has(bi) ? "done" : lesson.body[bi].speaker === role ? "done" : "done";
    }
    if (bi < turnIndex) return "done";
    if (bi > turnIndex) return "upcoming";
    // bi === turnIndex
    const isUser = lesson.body[bi].speaker === role;
    if (!isUser) return "system-playing";
    if (recorderRef.current && rmsLevel > 0) return "user-recording";
    if (turnBlobs.has(bi)) return "user-recorded";
    return "user-idle";
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Restart button (shown during session) */}
      {(phase === "in_session" || phase === "done") && (
        <div className="flex justify-end">
          <button type="button" onClick={restartSession}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
            <RotateCcw className="size-3" aria-hidden="true" />
            Restart session
          </button>
        </div>
      )}

      {/* Idle: show start button */}
      {phase === "idle" && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            You'll play <strong>{role}</strong>. Complete all {totalTurns} turns to create your recording.
          </p>
          <button type="button" onClick={startSession}
            className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Start practice
          </button>
        </div>
      )}

      {/* Turn list */}
      {phase !== "idle" && (
        <div className="space-y-3">
          {lesson.body.map((turn, bi) => (
            <TurnRow
              key={bi}
              turnIndex={bi}
              speaker={turn.speaker}
              text={turn.text}
              isUser={turn.speaker === role}
              state={getTurnState(bi)}
              onRecord={() => handleRecord(bi)}
              onStopRecording={handleStopRecording}
              onPlayback={() => handlePlayback(bi)}
              onContinue={() => handleContinue(bi)}
              onPlayModel={() => handlePlayModel(bi)}
              getRmsLevel={() => rmsLevel}
              hasBlob={turnBlobs.has(bi)}
            />
          ))}
        </div>
      )}

      {/* Done: Mix & Save */}
      {phase === "done" && (
        <div className="text-center pt-2">
          {mixError && <p className="mb-2 text-sm text-destructive">{mixError}</p>}
          <button type="button" onClick={handleMix}
            className="rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700">
            Mix & Save
          </button>
        </div>
      )}

      {/* Mixing */}
      {phase === "mixing" && (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground animate-pulse">
          Mixing your recording…
        </div>
      )}

      {/* Mixed: result card */}
      {phase === "mixed" && mixedBlob && (
        <MixResultCard
          mp3Blob={mixedBlob}
          durationMs={mixedDurationMs}
          lessonTitle={lesson.title}
          criticalThinkingQuestion={lesson.criticalThinkingQuestion}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/speaking/practice-session.tsx
git commit -m "feat: add PracticeSession state machine component"
```

---

## Task 14: Detail Page

**Files:**
- Create: `src/app/(app)/speaking/[lessonId]/page.tsx`

The detail page has: sticky header bar with role dropdown + tab switcher, two-column layout (main left, 320px sidebar right), Listen tab, Practice tab, My Recordings section below.

- [ ] **Step 1: Read the listening detail page for layout patterns**

```bash
cat src/app/\(app\)/listening/\[lessonId\]/page.tsx
```

- [ ] **Step 2: Write the detail page**

```tsx
// src/app/(app)/speaking/[lessonId]/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useSpeakingLesson } from "@/lib/lessons/load";
import { SampleListenTab } from "@/components/speaking/sample-listen-tab";
import { PracticeSession } from "@/components/speaking/practice-session";
import { HintPanel } from "@/components/speaking/hint-panel";
import { RecordingsHistory } from "@/components/speaking/recordings-history";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

type Tab = "listen" | "practice";

function RoleDropdown({
  role,
  characters,
  voices,
  hasBlobs,
  onChange,
}: {
  role: string;
  characters: [string, string];
  voices: Record<string, { sex: string; edgeVoice: string }>;
  hasBlobs: boolean;
  onChange: (role: string) => void;
}) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (hasBlobs && !confirm("Clear recorded turns and swap role?")) return;
    onChange(next);
  }
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">You are:</span>
      <div className="relative">
        <select
          value={role}
          onChange={handleChange}
          className="appearance-none rounded-md border bg-background py-1 pl-2 pr-6 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {characters.map((c) => {
            const v = voices[c];
            const label = v ? `${c} (${v.sex === "female" ? "F" : "M"})` : c;
            return <option key={c} value={c}>{label}</option>;
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </div>
    </div>
  );
}

function DetailContent() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading, error } = useSpeakingLesson(lessonId);

  const [tab, setTab] = useState<Tab>("listen");
  const [role, setRole] = useState<string>("");
  const [hasDraftBlobs, setHasDraftBlobs] = useState(false);

  // Default role = characters[0] once lesson loads
  if (lesson && !role) setRole(lesson.characters[0]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 text-center text-muted-foreground">
        Lesson not found.{" "}
        <Link href="/speaking" className="underline">Back to Speaking</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Link href="/speaking" className="shrink-0 rounded-md p-1 hover:bg-accent" aria-label="Back to Speaking">
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className={cn("shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase", LEVEL_COLORS[lesson.level])}>
            {lesson.level}
          </span>
          <h1 className="truncate text-sm font-semibold">{lesson.title}</h1>
        </div>
        <RoleDropdown
          role={role}
          characters={lesson.characters}
          voices={lesson.voices}
          hasBlobs={hasDraftBlobs}
          onChange={(next) => { setRole(next); setHasDraftBlobs(false); }}
        />
        {/* Tab switcher */}
        <div className="flex rounded-md border">
          {(["listen", "practice"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors first:rounded-l-md last:rounded-r-md",
                tab === t ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Two-column layout: main | 320px sidebar */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          {tab === "listen" ? (
            <SampleListenTab lesson={lesson} />
          ) : (
            <PracticeSession lesson={lesson} role={role} />
          )}
          <RecordingsHistory lessonId={lesson.id} lessonTitle={lesson.title} />
        </div>
        <aside className="w-full shrink-0 lg:w-80">
          <HintPanel lesson={lesson} />
        </aside>
      </div>
    </div>
  );
}

export default function SpeakingDetailPage() {
  return (
    <Suspense>
      <DetailContent />
    </Suspense>
  );
}
```

- [ ] **Step 3: Start dev server and manually verify the detail page**

```bash
npm run dev
```

Open `http://localhost:3000/speaking/speaking-a1-001`.

**Check list:**
- [ ] Header renders with Back link, level pill, role dropdown defaulting to "Customer (F)", Listen/Practice tabs
- [ ] Listen tab renders (TranscriptPlayer visible even if audio CDN isn't live yet)
- [ ] Practice tab renders with "Start practice" button
- [ ] Clicking "Start practice" starts session at turn 0
- [ ] Role dropdown shows both characters with gender labels
- [ ] Sidebar shows vocab, starters, and grammar note accordion
- [ ] Page is two-column on desktop, stacked on mobile

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/speaking/\[lessonId\]/page.tsx
git commit -m "feat: add speaking detail page with Listen + Practice tabs, role selector, sidebar"
```

---

## Task 15: Extend generate-audio.py for Speaking

**Files:**
- Modify: `scripts/generate-audio.py`

The existing script handles listening lessons. Add `--kind speaking` which processes three audio types (sentences, vocab, starters) into subfolders.

- [ ] **Step 1: Read generate-audio.py to understand its structure**

```bash
cat scripts/generate-audio.py
```

Confirm: `LESSONS_DIR` is hardcoded to `listening`, `process_lesson()` writes `{lessonId}/{sentenceId}.mp3`, `find_lesson_paths()` validates prefix is "listening".

- [ ] **Step 2: Add speaking support**

Apply these changes to `scripts/generate-audio.py`:

**At the top, after existing constants:**
```python
SPEAKING_LESSONS_DIR = REPO_ROOT / "public" / "lessons" / "speaking"
```

**New function `process_speaking_lesson()`** (add after `process_lesson()`):

```python
def process_speaking_lesson(lesson_path: Path, cache_dir: Path, force: bool) -> tuple[int, int]:
    """Generate MP3s for sentences, hintVocab, and hintStarters. Returns (n_changed, n_total)."""
    data = json.loads(lesson_path.read_text(encoding="utf-8"))
    lesson_id: str = data["id"]
    lesson_root = cache_dir / lesson_id

    # Determine the narrator voice for vocab/starters (first character's voice)
    narrator_char = data["characters"][0]
    narrator_voice = data["voices"][narrator_char]
    narrator_edge_voice: str = narrator_voice["edgeVoice"]
    narrator_rate: str = age_to_rate(narrator_voice["age"])

    changed = 0

    # 1. Sentences (same logic as listening, but output goes to sentences/ subfolder)
    sentences_dir = lesson_root / "sentences"
    sentences_dir.mkdir(parents=True, exist_ok=True)
    manifest = {} if force else load_manifest(sentences_dir)
    new_manifest: dict[str, ManifestEntry] = {}

    for s in data["sentences"]:
        sid: str = s["id"]
        speaker: str = s["speaker"]
        voice = data["voices"][speaker]
        edge_voice: str = voice["edgeVoice"]
        rate: str = age_to_rate(voice["age"])
        h = sentence_hash(s["text"], edge_voice, rate)
        existing = manifest.get(sid)
        out_path = sentences_dir / f"{sid}.mp3"
        if existing and existing.hash == h and out_path.exists() and not force:
            new_manifest[sid] = existing
            s["durationMs"] = existing.duration_ms
            continue
        print(f"   sentences/{sid}: synth ({edge_voice})")
        asyncio.run(synth_sentence(s["text"], edge_voice, rate, out_path))
        duration = measure_duration_ms(out_path)
        new_manifest[sid] = ManifestEntry(sid, h, edge_voice, duration)
        s["durationMs"] = duration
        changed += 1

    save_manifest(sentences_dir, new_manifest)
    data["totalDurationMs"] = sum(e.duration_ms for e in new_manifest.values())

    # 2. Hint vocab (narrator voice)
    vocab_dir = lesson_root / "vocab"
    vocab_dir.mkdir(parents=True, exist_ok=True)
    vocab_manifest = {} if force else load_manifest(vocab_dir)
    new_vocab_manifest: dict[str, ManifestEntry] = {}

    for v in data.get("hintVocab", []):
        vid: str = v["id"]
        h = sentence_hash(v["phrase"], narrator_edge_voice, narrator_rate)
        existing = vocab_manifest.get(vid)
        out_path = vocab_dir / f"{vid}.mp3"
        if existing and existing.hash == h and out_path.exists() and not force:
            new_vocab_manifest[vid] = existing
            continue
        print(f"   vocab/{vid}: synth ({narrator_edge_voice})")
        asyncio.run(synth_sentence(v["phrase"], narrator_edge_voice, narrator_rate, out_path))
        duration = measure_duration_ms(out_path)
        new_vocab_manifest[vid] = ManifestEntry(vid, h, narrator_edge_voice, duration)
        changed += 1

    save_manifest(vocab_dir, new_vocab_manifest)

    # 3. Hint starters (narrator voice)
    starters_dir = lesson_root / "starters"
    starters_dir.mkdir(parents=True, exist_ok=True)
    starters_manifest = {} if force else load_manifest(starters_dir)
    new_starters_manifest: dict[str, ManifestEntry] = {}

    for hs in data.get("hintStarters", []):
        hid: str = hs["id"]
        h = sentence_hash(hs["text"], narrator_edge_voice, narrator_rate)
        existing = starters_manifest.get(hid)
        out_path = starters_dir / f"{hid}.mp3"
        if existing and existing.hash == h and out_path.exists() and not force:
            new_starters_manifest[hid] = existing
            continue
        print(f"   starters/{hid}: synth ({narrator_edge_voice})")
        asyncio.run(synth_sentence(hs["text"], narrator_edge_voice, narrator_rate, out_path))
        duration = measure_duration_ms(out_path)
        new_starters_manifest[hid] = ManifestEntry(hid, h, narrator_edge_voice, duration)
        changed += 1

    save_manifest(starters_dir, new_starters_manifest)

    n_sentences = len(data["sentences"])
    n_vocab = len(data.get("hintVocab", []))
    n_starters = len(data.get("hintStarters", []))
    n_total = n_sentences + n_vocab + n_starters

    lesson_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"   ✓ {lesson_id}: {changed} of {n_total} audio files regenerated")
    return changed, n_total
```

**New function `find_speaking_lesson_paths()`** (add after `find_lesson_paths()`):

```python
def find_speaking_lesson_paths(args: argparse.Namespace) -> list[Path]:
    if args.lesson_id:
        parts = args.lesson_id.split("-")
        if len(parts) != 3 or parts[0] != "speaking":
            sys.exit(f"bad speaking lesson id: {args.lesson_id}")
        path = SPEAKING_LESSONS_DIR / parts[1].lower() / f"{args.lesson_id}.json"
        if not path.exists():
            sys.exit(f"lesson file not found: {path}")
        return [path]
    if args.level:
        d = SPEAKING_LESSONS_DIR / args.level.lower()
        return sorted(d.glob("speaking-*.json")) if d.exists() else []
    if args.all:
        return sorted(SPEAKING_LESSONS_DIR.glob("*/speaking-*.json"))
    sys.exit("must pass <lesson_id>, --level X, or --all")
```

**Update `main()` to support `--kind`:**

Replace the parser section in `main()`:

```python
parser = argparse.ArgumentParser(description="Generate lesson audio")
parser.add_argument("lesson_id", nargs="?")
parser.add_argument("--level", help="e.g. a2")
parser.add_argument("--all", action="store_true")
parser.add_argument("--force", action="store_true")
parser.add_argument("--dry-run", action="store_true")
parser.add_argument("--kind", choices=["listening", "speaking"], default="listening", help="lesson kind")
args = parser.parse_args()
```

Replace the `lessons = find_lesson_paths(args)` line and the main loop:

```python
is_speaking = args.kind == "speaking"
lessons = find_speaking_lesson_paths(args) if is_speaking else find_lesson_paths(args)
if not lessons:
    print("no lessons matched")
    return 0

# ... (cache_dir, audio_repo, audio_root setup unchanged) ...

if args.dry_run:
    for path in lessons:
        data = json.loads(path.read_text(encoding="utf-8"))
        n_audio = len(data["sentences"])
        if is_speaking:
            n_audio += len(data.get("hintVocab", [])) + len(data.get("hintStarters", []))
        print(f"→ {data['id']}: {n_audio} audio files across {len(data['voices'])} voice(s)")
    return 0

# ... (token, branch, ensure_audio_repo, ensure_clone unchanged) ...

for path in lessons:
    data = json.loads(path.read_text(encoding="utf-8"))
    print(f"→ {data['id']}")
    if is_speaking:
        n_changed, n_total = process_speaking_lesson(path, audio_root, args.force)
    else:
        n_changed, n_total = process_lesson(path, audio_root, args.force)
    if n_changed > 0:
        commit_and_push(audio_root, data["id"], n_changed, n_total, branch)
        print(f"   pushed {data['id']}: {n_changed} of {n_total}")
    else:
        print(f"   unchanged {data['id']}")
return 0
```

- [ ] **Step 3: Verify Python syntax**

```bash
python3 -c "import ast; ast.parse(open('scripts/generate-audio.py').read()); print('OK')"
```

Expected: `OK`.

- [ ] **Step 4: Dry-run test**

```bash
uv run scripts/generate-audio.py --kind speaking --dry-run speaking-a1-001
```

Expected: prints `→ speaking-a1-001: 9 audio files across 2 voice(s)` (5 sentences + 2 vocab + 2 starters).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-audio.py
git commit -m "feat: extend generate-audio.py with --kind speaking for sentences/vocab/starters"
```

---

## Task 16: generate-speaking-lesson Skill

**Files:**
- Create: `.claude/skills/generate-speaking-lesson/SKILL.md`

- [ ] **Step 1: Read generate-listening-lesson/SKILL.md for the pattern**

```bash
cat .claude/skills/generate-listening-lesson/SKILL.md
```

Note the overall structure: resolve inputs → plan → find next IDs → write lessons → rebuild indexes → validate → generate audio → re-rebuild.

- [ ] **Step 2: Write the skill**

Create `.claude/skills/generate-speaking-lesson/SKILL.md`:

````markdown
# generate-speaking-lesson

Generate new speaking lessons for the english-learning app. Produces JSON lesson files under `public/lessons/speaking/{level}/`, then rebuilds `public/lessons/speaking/index.json` and runs the Python TTS script to generate + upload per-sentence, per-vocab, and per-starter MP3s to the public audio repo.

Use when asked to "add speaking lessons", "generate more A1/A2/B1/B2/C1 speaking lessons", "scale up speaking content", or `/generate-speaking-lesson`.

---

## Inputs

| Input | Required | Default | Notes |
|---|---|---|---|
| `level` | Yes | — | A1 / A2 / B1 / B2 / C1 |
| `count` | No | 5 | Number of new lessons to generate |
| `topics` | No | — | Comma-separated override topics |

If inputs are ambiguous, ask once. After that, proceed without confirmation.

---

## Lesson Content Rules

### Always
- Format: always `"dialogue"` (body is array of `{speaker, text}` turns).
- Characters: exactly 2. Both must be keys in `voices`. Both must have `accent: "en-US"`.
- Voices: always en-US. Pick from `scripts/voice-catalog.json` under `"en-US"` key. Assign by character gender.
- `accents`: always `["en-US"]`.
- `hintStarters`: 2–4 entries, ids `h1..hK`, each a sentence-starter template with `…` placeholder.
- `hintVocab`: 3–6 entries, ids `v1..vM`, each with `phrase`, `meaningVi`, `pronunciation` (IPA for US accent).
- `criticalThinkingQuestion`: one open-ended question about the dialogue theme.
- `translationVi`: full Vietnamese translation of the dialogue.
- `grammarNotes`: 1–3 entries covering patterns from the dialogue.
- `annotations`: 3–8 phrases from the dialogue with Vietnamese gloss.

### DO NOT write
- `durationMs` on individual sentences (written by TTS script).
- `totalDurationMs` at top level (written by TTS script).

### Per-level content targets

| Level | Dialogue turns (body) | Sentences | Vocabulary difficulty |
|---|---|---|---|
| A1 | 8–12 | 8–15 | Basic daily phrases |
| A2 | 10–16 | 10–18 | Common situations |
| B1 | 14–20 | 14–22 | Everyday contexts |
| B2 | 16–24 | 16–26 | Nuanced expression |
| C1 | 20–30 | 20–32 | Sophisticated register |

### Sentence grouping invariant
Consecutive sentences with the same speaker must concatenate (joined by `" "`) to exactly the `text` field of the corresponding body turn. The schema validator enforces this.

---

## Workflow

### Step 1: Resolve inputs
Confirm `level` and `count`. Pick topics from this list or invent relevant ones:
- A1: ordering food, greetings, directions, introductions, shopping basics
- A2: making appointments, phoning a hotel, at the doctor, weekend plans
- B1: job interviews, travel problems, discussing hobbies, giving advice
- B2: negotiating, discussing current events, academic advising
- C1: debating policy, consulting a specialist, complex negotiation

### Step 2: Find next IDs
```bash
ls public/lessons/speaking/{level_lower}/ 2>/dev/null | sort | tail -1
```
Next ID = `speaking-{level_lower}-{NNN}` where NNN = (last number + 1) zero-padded to 3 digits. Start at 001 if none exist.

### Step 3: Write lessons one at a time

For each lesson:

1. **Pick characters and voices** from `scripts/voice-catalog.json`:
   - Read the catalog: `cat scripts/voice-catalog.json`
   - Pick 2 character names appropriate to the scenario (e.g., "Doctor" + "Patient").
   - For each, pick a voice from `voices["en-US"][age][sex]` array. Randomize within the matching list.

2. **Generate dialogue** (12–20 body turns for A1, scaling up per table above).
   - Keep it natural and context-appropriate.
   - Ensure back-and-forth alternation (no 3+ consecutive turns by same speaker unless very natural).

3. **Split into sentences**: each body turn may be split into 1–3 sentences if it contains multiple clauses. The concatenated sentence texts must equal the body turn text exactly (trimmed).

4. **Write the lesson JSON file** to `public/lessons/speaking/{level_lower}/{id}.json`.

5. **Validate** immediately after writing:
```bash
node scripts/validate-lessons.mjs 2>&1 | grep {id}
```
Fix any errors before writing the next lesson.

### Step 4: Rebuild speaking index

```bash
node scripts/rebuild-indexes.mjs
```

Verify: `public/lessons/speaking/index.json` contains all new lessons.

### Step 5: Validate all speaking lessons

```bash
node scripts/validate-lessons.mjs 2>&1 | grep -E "speaking|error|warning" | head -40
```

Expected: only "audio not generated yet" warnings (no errors).

### Step 6: Generate audio for each lesson

Run for each new lesson ID:
```bash
uv run scripts/generate-audio.py --kind speaking {lesson_id}
```

This generates `sentences/sN.mp3`, `vocab/vN.mp3`, `starters/hN.mp3` and pushes to the audio CDN.

### Step 7: Re-rebuild index (picks up totalDurationMs)

```bash
node scripts/rebuild-indexes.mjs
```

### Step 8: Report

List each generated lesson: ID, title, turn count, sentence count, and CDN base URL.

---

## Audio CDN structure (for reference)

```
speaking-a1-001/
  sentences/s1.mp3 … sN.mp3
  vocab/v1.mp3 … vM.mp3
  starters/h1.mp3 … hK.mp3
  sentences/manifest.json
  vocab/manifest.json
  starters/manifest.json
```

CDN base in lesson JSON:
```json
"audio": {
  "cdnBase": "https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main/{lesson_id}",
  "manifestVersion": 1
}
```
````

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/generate-speaking-lesson/
git commit -m "feat: add generate-speaking-lesson skill"
```

---

## Task 17: Integration Verification

Final verification across the whole feature.

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: All existing tests pass. Speaking schema tests pass.

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run lesson validation**

```bash
node scripts/validate-lessons.mjs
```

Expected: Only warnings about audio not generated (no schema errors).

- [ ] **Step 4: Start dev server and do a full manual pass**

```bash
npm run dev
```

**Hub page** (`/speaking`):
- [ ] Sidebar shows "Speaking" as active link (no "Coming soon")
- [ ] Hub shows lesson grid with the sample lesson card
- [ ] Card shows: title, level pill, "Customer · Barista", duration (blank until audio generated), "4 turns"
- [ ] Level filter chips work
- [ ] Search works (try "coffee")
- [ ] Sort dropdown changes order

**Detail page** (`/speaking/speaking-a1-001`):
- [ ] Header renders with Back arrow, "A1" pill, title, role dropdown, Listen/Practice tabs
- [ ] Role dropdown shows "Customer (F)" and "Barista (M)"
- [ ] Listen tab renders TranscriptPlayer (no audio until CDN is live, but no crash)
- [ ] Practice tab shows "Start practice" button
- [ ] Clicking "Start practice" → session starts at turn 0 (Barista turn, system role)
- [ ] Sidebar shows key vocabulary, starters, grammar note
- [ ] Grammar note accordion expands on click

**Practice session (simulate with sample lesson)**:
- [ ] First turn (system) auto-plays (if CDN audio exists) then advances
- [ ] Second turn (user — Customer) shows "Play model" + "Record" buttons
- [ ] Clicking "Record" prompts microphone permission
- [ ] After permission, VoiceVisualizer bars animate
- [ ] Recording auto-stops after 3s silence
- [ ] "Play back" plays the recording
- [ ] "Continue →" advances to next turn
- [ ] After all turns, "Mix & Save" button appears
- [ ] Clicking "Mix & Save" → spinner → MixResultCard with audio player + download button
- [ ] "My recordings" section appears below Practice tab with the new recording

- [ ] **Step 5: Final commit if everything passes**

```bash
git add -p  # review any leftover changes
git commit -m "feat: complete speaking feature — hub, detail, practice session, mixing, DB, audio pipeline"
```

---

## Self-Review

Checking spec coverage against all tasks:

| Spec Section | Covered By |
|---|---|
| Routes `/speaking` + `/speaking/[lessonId]` | Tasks 5, 14 |
| Lesson JSON schema (all 7 invariants) | Task 1 |
| Hub page: level chips, favorites, learning/learned filters, tag filter, search, sort | Task 5 |
| Hub: `X / total completed` header counter | Task 5 |
| Hub: `useSpeakingRecordingsByLesson()`, `useSpeakingSessionDrafts()` | Tasks 3, 5 |
| Lesson card: characters badge, duration, turn count, bookmark star, status badge | Task 5 |
| Detail: `max-w-6xl`, two-column desktop / stacked mobile | Task 14 |
| Detail header: back link, title, level pill, role dropdown, tab switcher | Task 14 |
| Role dropdown: swap prompt when turns exist | Task 14 |
| Listen tab: TranscriptPlayer with speaking CDN adapter | Tasks 7, 8 |
| Listen tab: `{cdnBase}/sentences/{sentenceId}.mp3` URL pattern | Task 8 |
| Listen tab: translation panel, grammar notes | Task 8 |
| Practice tab: state machine `idle → in_session → done → mixed` | Task 13 |
| System turn: auto-play, waveform, advance on ended | Tasks 10, 13 |
| User turn: "Play model" button, Record button, auto-stop (3s silence + hard cap) | Tasks 6, 9, 10, 13 |
| User turn: Re-record, Play back, Continue (auto 2s) | Tasks 10, 13 |
| Mix & Save: progress overlay, concat + lamejs Worker, save to Dexie | Tasks 7, 13 |
| Mix & Save: inline audio player, download, critical thinking question | Tasks 12, 13 |
| Restart session: confirm dialog, clear draft | Task 13 |
| Sidebar: hint vocab + play button, hint starters + play button, grammar notes | Task 11 |
| My Recordings panel: date, role, duration, play, download, delete | Task 12 |
| Dexie v6: `speakingRecordings`, `speakingSessionDrafts` | Task 2 |
| DB types: `SpeakingRecording`, `SpeakingSessionDraft` | Task 2 |
| Session draft: save/restore in-progress session | Tasks 3, 13 |
| `scripts/generate-audio.py --kind speaking` | Task 15 |
| CDN folder layout: `sentences/`, `vocab/`, `starters/` | Task 15 |
| `generate-speaking-lesson` skill | Task 16 |
| Nav: Speaking no longer "comingSoon" | Task 5 |
| `rebuild-indexes.mjs` + `validate-lessons.mjs` extended | Task 4 |

**Placeholder scan:** No TBDs, TODOs, or "implement later" in any step. All code blocks are complete.

**Type consistency check:**
- `SpeakingLesson` exported from `speaking-schema.ts`, used in `sample-listen-tab.tsx`, `practice-session.tsx`, `hint-panel.tsx`, `mix-result-card.tsx`, detail page — consistent.
- `SpeakingRecording` from `types.ts` used in both hooks — consistent.
- `MixChunk` type defined in `mixer.ts`, imported in `practice-session.tsx` — consistent.
- `RecorderHandle.onStop` assigned before `start()` in `practice-session.tsx` — consistent.
- `createRecorder` imported from `@/lib/audio/recorder` in `practice-session.tsx` — consistent.
