# Writing lesson — design

Status: approved 2026-05-21
Owner: bjsai@siliconprime.com
Mirrors: Reading lesson UI/UX (`src/app/(app)/reading`, `src/components/reading`)

## Summary

Add a Writing skill that mirrors Reading's hub + lesson-detail UX. Each writing
lesson has a topic, a prompt, hint vocabulary, hint sentence starters, a
teacher-written sample answer with translation and grammar notes, a multiple-
choice quiz ("pick the best-written sentence for this topic"), and a free-write
exercise. The learner writes their own text and gets AI feedback through a
relay: the app generates a prompt embedding a unique callback URL; the learner
pastes the prompt + their text into Gemini/ChatGPT; the model POSTs structured
JSON back to a Vercel API route, which writes it to Firestore; the client
listens on Firestore and renders the result the moment it arrives.

## Goals

- Reuse Reading's primitives (filter chips, lesson cards, search, sort, timer,
  bookmark, notes, layout toggle, MC questions, attempt history) so Writing
  feels like the same product.
- Lesson content authored as JSON under `public/lessons/writing/{level}/`, same
  loading pattern as Reading and Listening.
- Free-write feedback arrives automatically without the user having to paste a
  response back in the common case.
- Attempts (including LLM result) persist locally so the learner can review
  past feedback and so the hub shows a best score and learning/learned states.

## Non-goals (v1)

- Authoring tooling. Lessons are hand-written JSON or generated via a follow-up
  skill modeled on `/generate-listening-lesson`.
- Streaming/in-progress LLM updates. Result delivery is single-shot.
- User-supplied LLM API keys (the relay path is the v1).
- Speaking, Vocab, Grammar tabs.

## Architecture

Three new pieces sit on top of the existing client-side Next.js + Dexie app:

1. Writing lesson JSON schema (additive, parallel to reading/listening).
2. Relay backend on Vercel: two Next.js route handlers + Firebase Firestore.
3. New Dexie tables `writingDrafts` and `writingAttempts` (DB v5).

Why a backend now? The current app is fully client-side, but the user's
preferred result-delivery mechanism is "LLM POSTs to an API that writes to
Firebase, client listens." That requires server endpoints and a shared store.
Vercel + Firestore is the chosen stack.

Why a separate `writingAttempts` table instead of generalizing `attempts`? The
schema diverges enough — reading is option-pick scoring; writing is multi-
dimension rubric + free text + foreign LLM payload — that a union table would
force every reading query to filter by kind and complicate the rubric typing.
`bookmarks`, `notes`, and `preferences` stay unified because they're already
just lesson-id keyed.

## Lesson JSON schema

Files: `public/lessons/writing/{a1|a2|b1|b2|c1}/writing-{level}-NNN.json`.
Index: `public/lessons/writing/index.json` (array of `WritingLessonMeta`).

```ts
type WritingLesson = {
  id: string;                 // "writing-a1-001"
  level: CefrLevel;
  title: string;              // shown on card / header
  summary: string;            // short hook
  tags: string[];             // same tag system as reading
  topic: string;              // e.g. "My favorite weekend"
  prompt: string;             // task instruction
  minWords?: number;
  maxWords?: number;
  hintStarters: string[];     // ["On weekends, I usually…", ...]
  hintVocab: Annotation[];    // reuse Annotation {phrase, meaningVi, pronunciation?, exampleEn?}
  sampleText: string;
  sampleAnnotations: Annotation[];
  sampleGrammarNotes: GrammarNote[];
  sampleTranslationVi: string;
  mcQuestions: Question[];    // reuse existing Question shape
  criticalThinkingQuestion?: string;
};

type WritingLessonMeta = {
  id: string;
  level: CefrLevel;
  title: string;
  summary: string;
  tags: string[];
  topic: string;
};
```

Updates required:

- `src/lib/lessons/types.ts` — export `WritingLesson`, `WritingLessonMeta`.
- `src/lib/lessons/schema.ts` — add zod schemas `writingLessonSchema`,
  `writingLessonsIndexSchema` (reuse `annotationSchema`, `grammarNoteSchema`,
  `questionSchema`).
- `src/lib/lessons/load.ts` — extend `parseKindAndLevel` to recognize
  `writing-`; add `useWritingLessonsIndex()` and `useWritingLesson(id)`.

The lesson id prefix (`writing-`, `reading-`, `listening-`) remains the canonical
discriminator across the codebase.

## Hub page — `/writing`

A copy of `src/app/(app)/reading/page.tsx` adapted to writing:

- Same `LessonSearch`, `FilterChipRow` (levels), `TagFilterRow`, `SortSelect`,
  `LessonCard`, "Favorites / Learning / Learned" chips, "Clear filters",
  "X / Y completed" counter.
- "Learning" = has a `writingDrafts` entry.
- "Learned" = has at least one row in `writingAttempts`.
- Sort key is reused (`writing:sortBy`).
- `LessonCard` is lightly generalized to render either reading or writing
  metas: it already takes a `LessonMeta` and a best-attempt, both of which are
  shape-compatible. The detail link is derived from `lesson.id` prefix.

## Lesson-detail page — `/writing/[lessonId]`

Layout mirrors reading detail, with a writing-specific body. Section order:

1. Sticky header: Back · title · level chip · tags · best score ·
   `BookmarkButton` · `LessonTimer` · `HintSettingsPopover` · `LayoutToggle`.
2. **Topic & Prompt card** — `Topic: <topic>` + `<prompt>` + optional word-count
   guidance ("Aim for 40–120 words").
3. **Main two-column area** (one column on mobile; reuses `LayoutToggle`):
   - Left/main: `WritingEditor` (textarea + word counter + "Copy my text"
     button). Below it: `SampleAnswerReveal` (collapsed by default; opens any
     time the learner clicks; opening flips `sampleRevealed=true` on the
     current `writingDrafts` row, which surfaces as a small badge in attempt
     history — honest, not punitive).
   - Right: `HintPanel` (hint vocab + hint starters) and, once the sample is
     revealed, `GrammarNotes` for the sample (gated by `HintSettings`).
4. **MC quiz** — reuses `MCQuestions` from
   `src/components/reading/mc-questions.tsx`. Factor its dependency on the
   reading `QuizSection` context behind a small props-or-context shim so the
   writing session context can drive the same UI without dragging in reading's
   cloze/score machinery.
5. **Free-write feedback** —
   - `PromptCopyPanel`: shows the auto-generated LLM prompt with the embedded
     callback URL; one-click "Copy prompt + my text" (primary) and "Copy
     paste-back instructions" (fallback for non-tool-capable models).
   - Status: "Waiting for AI feedback…" with the callback URL visible for
     debugging and a "Cancel & retry" button.
   - On `status === 'ready'`: `WritingResultPanel` renders score chips,
     corrections (original vs fixed with explanation), suggestions list, and a
     collapsible polished rewrite.
6. Critical-thinking quote block (if `criticalThinkingQuestion` present).
7. `WritingAttemptHistory` — same affordance as reading's `AttemptHistory`,
   per-attempt row expands to show its stored `llmResult`.
8. `LessonNotes` — reused as-is (lesson-id keyed).

A new `WritingSession` context (parallel to reading's `QuizSection`) owns the
draft state, the active relay token, and the submit/cancel actions. Submitting
the free-write does **not** require completing the MC quiz, and vice versa —
both can be finished independently, but the attempt is only saved to
`writingAttempts` when **both** MC is graded and the LLM result has arrived (or
the learner explicitly clicks "Save without AI feedback").

## Relay backend + Firestore

### Route handlers (Next.js App Router)

`src/app/api/writing/session/route.ts`

- `POST` — body: `{ lessonId, profileId? }`. Server generates a 16-char base32
  token, writes
  `writingSessions/{token} = { token, lessonId, profileId: profileId ?? null, status: 'pending', createdAt, expiresAt: now + 24h }`
  via Firebase Admin SDK. Returns `{ token, callbackUrl: '<origin>/api/writing/result/<token>' }`.

`src/app/api/writing/result/[token]/route.ts`

- `POST` — body validated by zod against `writingLLMResultSchema`. Loads the
  Firestore doc; if `status !== 'pending'` or `expiresAt` is past, returns 409.
  Otherwise writes `{ status: 'ready', result, receivedAt }`. Returns 200 with
  a short success message that the LLM can echo to the learner.
- `OPTIONS` — CORS preflight.
- `GET` — optional, returns `{ status, receivedAt? }` for debug/manual polling.

CORS: `Access-Control-Allow-Origin: *` on `/api/writing/result/*` so any model
or tool can call it. Per-IP rate limit (e.g. 30/min) using an in-memory
sliding window for v1; revisit if abuse appears.

### Firebase

- `src/lib/firebase/admin.ts` — initializes Admin SDK from server env vars.
- `src/lib/firebase/client.ts` — initializes the client SDK from
  `NEXT_PUBLIC_FIREBASE_*` env vars; exports a configured `db`.
- Collection: `writingSessions` (single collection, doc id = token).
- Firestore security rules: `read: true` (anyone with a token can read their
  own session doc); `write: false` (all writes go through server route
  handlers via Admin SDK).
- TTL: enable Firestore TTL policy on `expiresAt` so docs are auto-deleted
  ~24h after creation.

### Client subscription

The detail page calls `POST /api/writing/session` once per lesson session
(when the user first focuses the editor, or on demand when they click "Get AI
feedback") and stores the token in the `writingDrafts` row. While
`writingDrafts.sessionToken` is set, the page subscribes to the matching
Firestore doc with `onSnapshot`. The first time the doc flips to `ready`, the
app:

1. Saves a new `writingAttempts` row with the user's text, MC results (if
   graded), and the `llmResult` payload.
2. Clears `sessionToken` on the draft so future submissions get a fresh token.
3. Renders the `WritingResultPanel`.

If the doc expires before a response arrives, the subscription resolves to
"expired"; the UI offers a "Generate a new prompt" button which calls
`/api/writing/session` again.

## LLM result schema

```ts
type WritingLLMResult = {
  scores: {
    task: number;        // 0–10
    grammar: number;     // 0–10
    vocabulary: number;  // 0–10
    coherence: number;   // 0–10
    overall: number;     // 0–10
  };
  corrections: { original: string; fixed: string; explanation: string }[];
  suggestions: string[];
  rewritten: string;
  model?: string;        // optional; LLM can self-report
};
```

`writingLLMResultSchema` (zod) validates this on the server before writing.

## Dexie schema (v5)

Add `writingDrafts` and `writingAttempts` in `src/lib/db/client.ts` as a new
version block. No data migration is required — both tables start empty.

```ts
this.version(5).stores({
  // ...all existing tables unchanged...
  writingDrafts: "[profileId+lessonId]",
  writingAttempts: "id, [profileId+lessonId], completedAt",
});
```

Row shapes (added to `src/lib/db/types.ts`):

```ts
type WritingDraft = {
  profileId: string;
  lessonId: string;
  text: string;
  mcPicks: Record<string, 0 | 1 | 2 | 3>;
  sessionToken: string | null;
  sampleRevealed: boolean;
  updatedAt: number;
  durationMs: number;
};

type WritingAttempt = {
  id: string;             // crypto.randomUUID()
  profileId: string;
  lessonId: string;
  text: string;
  mcScore: number;
  mcTotal: number;
  llmResult: WritingLLMResult | null;
  sampleRevealed: boolean;
  completedAt: number;
  durationMs: number;
};
```

New queries in `src/lib/db/queries.ts`: `getWritingDraft`, `saveWritingDraft`,
`deleteWritingDraft`, `listWritingAttemptsForLesson`,
`saveWritingAttempt`, `bestWritingAttemptByLesson`.

New hooks under `src/lib/db/`: `use-writing-drafts.ts`,
`use-best-writing-attempts.ts`. The hub page in `/writing` consumes
`useBestWritingAttempts()`; the existing `useBestAttempts` for reading remains
untouched.

## Components

New (in `src/components/writing/`):

- `writing-prompt-card.tsx` — topic + prompt + word-count guidance.
- `hint-panel.tsx` — hint vocab + hint starters.
- `writing-editor.tsx` — textarea, live word counter, min/max highlight, copy
  button for the learner's text.
- `sample-answer-reveal.tsx` — collapsed sample + translation + grammar
  (reuses `PassageAnnotation` and `HighlightedText` for vocab tooltips).
- `prompt-copy-panel.tsx` — generates and shows the LLM prompt with the
  callback URL embedded; "Copy prompt + my text" primary, "Copy paste-back
  instructions" fallback, plus a paste-back textarea that POSTs to the same
  result endpoint on the user's behalf.
- `writing-result-waiting.tsx` — "Waiting for AI feedback…" with the callback
  URL shown, a copy button for it, and a "Cancel & retry" button.
- `writing-result-panel.tsx` — score chips, corrections (diff list),
  suggestions, collapsible rewrite.
- `writing-attempt-history.tsx` — analogous to reading's `AttemptHistory` but
  renders `llmResult` instead of MC/cloze totals.

Reused as-is or near-as-is:

- `LessonSearch`, `FilterChipRow`, `TagFilterRow`, `SortSelect`, `LessonCard`,
  `BookmarkButton`, `LessonTimer`, `LessonNotes`, `HintSettingsPopover`,
  `LayoutToggle`, `GrammarNotes`, `PassageAnnotation`, `HighlightedText`,
  `ResumeBanner`.

One refactor to existing reading code: `MCQuestions` currently reads from
`QuizSection`'s context. Pull the data it needs (questions + picks + setPicks +
showHint) up into a small adapter prop or into a shared context interface so
that `MCQuestions` can be driven by `WritingSession` too. Reading behavior must
remain identical.

## Prompt template

The "Copy prompt + my text" button copies the following into the clipboard:

```
You are an English teacher giving feedback to a CEFR {level} learner.

Topic: {topic}
Task: {prompt}

The learner's writing is between <text> tags below.

Please grade and respond by calling this HTTP endpoint exactly once:

POST {callbackUrl}
Content-Type: application/json
Body (JSON):
{
  "scores": { "task": 0-10, "grammar": 0-10, "vocabulary": 0-10, "coherence": 0-10, "overall": 0-10 },
  "corrections": [ { "original": "...", "fixed": "...", "explanation": "..." } ],
  "suggestions": ["..."],
  "rewritten": "A polished version of the learner's text at this CEFR level."
}

Be kind, specific, and concrete. Keep the rewritten version close to the
learner's voice.

<text>
{user's writing}
</text>
```

Fallback button copies the same template but with the final instruction
swapped for "respond with the JSON in a fenced ```json block; the learner
will paste it back into the app."

## Sample-answer reveal behavior

- Sample is hidden by default behind a `SampleAnswerReveal` toggle.
- Clicking "Show sample answer" expands it inline — no submit gate. The intent
  is to keep the learner from giving up on a hard topic.
- On first reveal in a given draft, `writingDrafts.sampleRevealed = true`.
- When the attempt is saved, `sampleRevealed` is copied into the attempt and
  shown as a small "Sample viewed" badge in attempt history. No score
  penalty.

## Environment variables

Set on Vercel:

- Server: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- Client: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.

Local dev: copy from `.env.local` (gitignored). A `.env.example` documents
which keys are needed.

## Error handling

- Token creation failure (Firebase down) → toast "Couldn't start a feedback
  session, please retry"; submit button stays enabled.
- Result POST validation failure → API returns 400 with field-level errors;
  paste-back form surfaces them inline.
- Result POST after expiry → API returns 409 "session expired"; client shows
  expired state and offers to generate a new prompt.
- Duplicate POST (already ready) → API returns 409; client ignores.
- Network drop on the subscription → Firestore SDK auto-reconnects; if a
  ready doc arrives during the disconnect, the SDK delivers it on reconnect.

## Testing

- Unit: zod schemas (lesson + LLM result), Dexie queries (round-trip of draft
  and attempt), prompt-template builder.
- Component: `WritingEditor` word count, `PromptCopyPanel` copy behavior,
  `WritingResultPanel` rendering for representative payloads,
  `SampleAnswerReveal` recording the reveal flag.
- Integration: the relay route handlers with a Firestore emulator —
  create-session → POST result → assert doc state; expired session POST
  returns 409; idempotent re-POST returns 409.
- Manual: end-to-end against a deployed Vercel preview using the live ChatGPT
  / Gemini UI, verifying the result auto-renders.

## Open follow-ups (deferred)

- Authoring skill `/generate-writing-lesson` modeled on
  `/generate-listening-lesson`.
- Per-attempt diff visualization for the rewritten version.
- Migrating `useBestAttempts` to a unified facade once Speaking lands.
- Abuse handling on the result endpoint beyond per-IP rate limiting (auth
  tokens, signed callback URLs).
