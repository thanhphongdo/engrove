---
name: generate-listening-lesson
description: |
  Generate new listening lessons for the english-learning app. Produces JSON
  lesson files under public/lessons/listening/{level}/, then rebuilds the
  listening index.json and runs the Python TTS script to generate + upload
  per-sentence MP3s to the public audio repo. Each lesson carries everything
  a reading lesson does (passage or dialogue, annotations, translation,
  grammar notes, MC + cloze quizzes, critical thinking) PLUS a voices map, a
  sentences array, an accents list, and an audio.cdnBase pointer. Use when
  asked to "add listening lessons", "generate more A1/A2/B1/B2/C1 listening
  lessons", or "/generate-listening-lesson".
triggers:
  - generate listening lesson
  - generate listening lessons
  - add listening lesson
  - add listening lessons
  - more listening lessons
---

# generate-listening-lesson

You are producing listening lessons for a Next.js app that loads lessons from
`public/lessons/listening/`. Audio is hosted at
`https://github.com/thanhphongdo/english-learning-audio` and served via
jsDelivr at `https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main/`.

The schema is enforced by Zod at runtime. Run
`npx tsx scripts/validate-lessons.mjs` — if it passes, the JSON is correct
(though audio may still need to be generated).

## Inputs

Ask only what is missing.

| Input | Default | Notes |
|---|---|---|
| `level` | required | A1, A2, B1, B2, or C1 |
| `count` | 5 | Lessons to add this batch |
| `topics` | none — invent | Optional seed list |
| `formats` | mixed | paragraph or dialogue per lesson |
| `accentBias` | none | e.g. "all en-GB" for a UK batch; otherwise vary |

## Where files go

```
public/lessons/listening/
├── index.json                              ← rebuild last
├── a1/listening-a1-001.json
├── …
└── c1/listening-c1-NNN.json
```

ID convention: `listening-{level}-NNN` with the level lowercased in the
path and uppercased in the JSON's `level` field. NNN is zero-padded to 3.
Find the next ID per level: `ls public/lessons/listening/{level}/ | sort | tail -3`.

If the level folder doesn't exist yet, create it: `mkdir -p public/lessons/listening/{level}`.

## Per-level constraints

Same per-level minimums as reading (carry over from
`.claude/skills/generate-reading-lesson/SKILL.md`):

| Level | Body words | MC ≥ | Cloze ≥ | Annotations ≥ |
|---|---|---|---|---|
| A1 | 150–250 | 10 | 10 | 10 |
| A2 | 150–250 | 10 | 10 | 10 |
| B1 | 350–500 | 10 | 10 | 15 |
| B2 | 350–500 | 15 | 15 | 20 |
| C1 | 600–800 | 15 | 15 | 20 |

Sentence count emerges from word count: ~10–15 for A1/A2, ~20–25 for B1/B2,
~30+ for C1.

## Formats

Same as reading: `paragraph` (single narrator) or `dialogue` (multi-speaker
turns). Mix formats across the batch — don't ship five paragraphs in a row
or five dialogues in a row.

## Topic / cultural rules

Same as reading skill — read its sections on "Topic selection (the Deep
factor)", "Cultural and Setting Guidelines (Global Perspective)", and
"Anti-AI-ism filter". Listening shares those rules; nothing changes.

## Listening-specific fields

On top of the reading shape, every listening lesson has:

```json
{
  "accents": ["en-US"],
  "voices": {
    "Narrator": { "sex": "female", "age": "adult", "accent": "en-US", "edgeVoice": "en-US-AriaNeural" }
  },
  "sentences": [
    { "id": "s1", "speaker": "Narrator", "text": "First sentence." },
    { "id": "s2", "speaker": "Narrator", "text": "Second sentence." }
  ],
  "audio": {
    "cdnBase": "https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main/listening-a2-007",
    "manifestVersion": 1
  }
}
```

Do NOT write `durationMs` on sentences or `totalDurationMs` at the top
level — those are written by the TTS script after generation.

### Sentence splitting rules

- **Paragraph:** split on `.`/`!`/`?` boundaries. Keep punctuation with each
  sentence. Don't split inside quotes (`"He said, 'I came here.' "` is one
  sentence). Each sentence becomes one entry; speaker is always `"Narrator"`.
- **Dialogue:** start by emitting one sentence per turn. If a turn contains
  multiple sentences AND its text is longer than ~120 characters, split it
  into multiple consecutive sentences (same speaker, in order). Sentences
  must concatenate back to body — the validator enforces this.

### Voice picking

For each distinct speaker in `voices`:

1. Infer `sex` and `age` from the character's description in the story
   (e.g. "old bridge keeper" → senior + male; "schoolgirl" → child +
   female; "young software engineer" → adult).
2. Infer `accent` from story context. Examples:
   - Brooklyn coffee shop → en-US.
   - Edinburgh book seller → en-GB.
   - Sydney harbour ferry → en-AU.
3. If the story isn't tied to a place, pick weighted en-US 50% / en-GB 30%
   / en-AU 20%, AND ensure the batch isn't mono-accent — across a batch of
   5, at least two accents should appear.
4. Read `scripts/voice-catalog.json`, pick a uniformly-random voice from
   `[accent][age][sex]`, prefix with the locale: `edgeVoice = "en-US-" + name`.

The same speaker keeps the same voice through the lesson.

### `accents` field

Unique union of `voices[*].accent`, ordered by first appearance in the
`voices` object.

### `audio.cdnBase`

```
https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main/<lessonId>
```

### `audio.manifestVersion`

Always `1` for new lessons. Bump only when you change the voices of an
existing lesson and re-run the TTS script.

## Procedure

1. **Resolve inputs.** Confirm level, count, optional topics, optional
   accentBias.
2. **Plan the batch.** For each lesson, decide: format, topic + angle,
   speakers with (sex, age, accent). Don't write prose yet.
3. **Find next IDs.** `ls public/lessons/listening/{level}/` (mkdir if
   missing).
4. **Write lessons one at a time.** Each lesson = one `Write` call. Include
   every reading field PLUS `accents`, `voices`, `sentences`, `audio`.
   - For paragraph lessons, set `voices.Narrator` and use `"Narrator"` as
     the speaker for all sentences.
   - For dialogue lessons, one voice entry per speaker in body.
5. **Rebuild indexes.** `node scripts/rebuild-indexes.mjs`.
6. **Validate.** `npx tsx scripts/validate-lessons.mjs`. Errors must be
   fixed before continuing. Audio-pending warnings are expected at this
   step.
7. **Generate audio.** For each new lesson:
   ```
   uv run scripts/generate-audio.py listening-{level}-NNN
   ```
   Or batched: `uv run scripts/generate-audio.py --level {level}`.
   The script writes `durationMs` + `totalDurationMs` back into the lesson
   JSONs and pushes MP3s to the audio repo.
8. **Re-rebuild indexes.** `node scripts/rebuild-indexes.mjs` (so the index
   picks up the new `totalDurationMs`).
9. **Report.** Group new IDs by level. Per lesson, list: title, one-line
   angle, accents, total duration.

## First-run setup

If this is the first listening lesson on a fresh checkout:

1. Ensure `scripts/.env` exists: `[ -f scripts/.env ] || cp
   scripts/.env.example scripts/.env`. Tell the user to fill in
   `GITHUB_TOKEN` before step 7.
2. Ensure `scripts/voice-catalog.json` exists (it's committed; should be
   there already).

## Common failure modes

- **Forgot to rebuild listening index** → new lessons exist but the hub
  doesn't list them. Always run step 5.
- **Sentences don't concatenate back to body** → validator fails, points
  at the divergent character. Fix ONE side (usually the sentences side —
  the body is canonical).
- **`edgeVoice` not in voice-catalog.json** → validator fails. Re-pick
  from the right bucket.
- **`accents` doesn't equal union of voices[*].accent** → easy fix: rewrite
  the `accents` field after writing voices.
- **Forgot to run TTS script** → hub card shows "audio pending", Play all
  is disabled. Run step 7.
- **Edge-TTS throttled mid-batch** → re-run; the manifest skips completed
  sentences automatically.
- **Same topic theme twice in one batch** → vary domain (urban / craft /
  history / philosophy / relationship).

## File map

- Schema: `src/lib/lessons/schema.ts` (listeningLessonSchema)
- Types: `src/lib/lessons/types.ts` (ListeningLesson, Sentence, VoiceProfile, Accent)
- Loader: `src/lib/lessons/load.ts` (useListeningLesson, useListeningLessonsIndex)
- Voice catalog: `scripts/voice-catalog.json`
- TTS script: `scripts/generate-audio.py`
- Validator: `scripts/validate-lessons.mjs`
- Index rebuilder: `scripts/rebuild-indexes.mjs`
- Hub: `src/app/(app)/listening/page.tsx`
- Detail: `src/app/(app)/listening/[lessonId]/page.tsx`
