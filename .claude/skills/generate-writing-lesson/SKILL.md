---
name: generate-writing-lesson
description: |
  Generate new writing lessons for the english-learning app. Produces JSON
  lesson files under public/lessons/writing/{level}/, then rebuilds the
  shared index.json. Each lesson carries a topic + prompt, hint sentence
  starters, hint vocabulary with Vietnamese gloss, a teacher-written sample
  answer (with annotations, grammar notes, and Vi translation), a
  multiple-choice quiz that asks the learner to pick the best-written
  sentence for the topic, and an optional critical-thinking question. Use
  when asked to "add writing lessons", "generate more A1/A2/B1/B2/C1
  writing lessons", "scale up the writing content", or
  "/generate-writing-lesson".
triggers:
  - generate writing lesson
  - generate writing lessons
  - add writing lesson
  - add writing lessons
  - more writing lessons
  - scale up writing content
---

# generate-writing-lesson

You are producing writing-practice lessons for a Next.js app that loads
lessons from `public/lessons/writing/`. The schema is enforced by Zod at
runtime — invalid JSON will fail to load. Treat the validator as the source
of truth: if `npx tsx scripts/validate-lessons.mjs` passes, you are done.

A writing lesson is **not** a reading lesson. There is no long passage to
comprehend. The learner reads a short topic + prompt, optionally peeks at a
teacher-written sample, picks the best-written sentence in a small MC quiz,
then writes their own response. The lesson JSON's job is to scaffold their
attempt and give the in-app LLM-feedback flow a useful "model answer" to
compare against.

## Inputs you should resolve before writing

Ask the user only what is missing; otherwise use the defaults below.

| Input | Default | Notes |
|---|---|---|
| `level` | required | `A1`, `A2`, `B1`, `B2`, or `C1` |
| `count` | 5 | Number of new lessons in this batch |
| `topics` | none — invent | Optional seed list of topic angles |

For multi-level batches (e.g. "generate 5 of each"), run the procedure once
per level so quality stays even.

## Where files go

```
public/lessons/writing/
├── index.json                     ← metadata for ALL lessons (rebuild last)
├── a1/writing-a1-001.json         ← one file per lesson
├── a1/writing-a1-002.json
├── …
└── c1/writing-c1-050.json
```

### Picking the next ID

For each level you write to, list existing files and continue from
`max(existing) + 1`. The ID convention is **`writing-{level}-NNN`** with the
level lowercased in the file path but uppercased in the JSON's `level`
field. The level is parsed back from the ID at load time (see
`src/lib/lessons/load.ts`), so the ID format is load-bearing — don't deviate.

```bash
ls public/lessons/writing/a1/ 2>/dev/null | sort | tail -3   # find highest existing
```

## Per-level constraints (hard requirements)

Counts mirror the reading skill so the two lesson types feel matched in
depth. `hintStarters` is writing-specific (≥3 at every level).

| Level | Sample-answer word count | MC questions | Hint vocab | Sample annotations | Hint starters |
|---|---|---|---|---|---|
| A1 | 150–250 | ≥10 | ≥10 | ≥10 | ≥3 |
| A2 | 200–300 | ≥10 | ≥15 | ≥15 | ≥3 |
| B1 | 400–500 | ≥10 | ≥20 | ≥20 | ≥3 |
| B2 | 450–600 | ≥15 | ≥25 | ≥25 | ≥3 |
| C1 | 600–800 | ≥15 | ≥30 | ≥30 | ≥3 |

`minWords` / `maxWords` on the lesson are guidance shown in the editor.
Set them equal to the "Sample-answer word count" range above — the
learner's target matches the model answer's range. The `sampleText` must
fall inside that range (preferably near the middle of it).

Linguistic register must match the level:
- A1/A2 — present and past simple, adverbs of frequency, simple linkers
  (and, but, because), concrete topics
- B1 — present perfect, conditionals, modals, paragraphing, opinion phrases
- B2 — varied grammar (cleft, passive, complex concession), abstract
  argument with examples
- C1 — sophisticated register, hedging, nuanced argument, deliberate
  cohesion

A deep prompt at A1 must still be answerable in A1 grammar. Pitch the
*topic*, not the *grammar*, at the learner's level.

## Topic + prompt design (the heart of a writing lesson)

A good writing lesson has:

1. **A concrete topic.** "My favorite weekend" not "Discuss leisure."
2. **A specific prompt that says what to write and how long.** Include the
   target structure or vocabulary the learner should practise.
3. **An angle that gives the learner something real to say.** Not "describe
   your morning routine" — try "describe one ordinary moment from your week
   that made you smile, and explain why it stuck with you."

### Productive theme veins (mirror the reading skill — same global lens)

- urban psychology / sociology of public space
- obscure history (a forgotten letter, a fading craft)
- philosophy of attention, memory, recognition, time
- sustainable technology (concrete, not slogan)
- ethics of preservation
- the dignity of ordinary work or ordinary lives
- the way small habits compound
- relationships across age, language, role, or distance

For higher levels, the prompt should pose a real question (a tradeoff, a
choice, a paradox) so the learner has something to argue, not just describe.

### Cultural and Setting Guidelines (Global Perspective)

Same rules as the reading skill — focus on diverse international settings
and characters. When Vietnamese topics come up, frame them from a
foreigner's lens. Goal: practise English through global / outsider
viewpoints.

### Banned topics for AI-generated content

"benefits of exercise", "the history of the internet", "the importance of
sleep", "AI is changing the world", "social media has two sides", "the
four seasons", "my dream job", "describe yourself", "my best friend".

### Anti-AI-ism filter (applies to the sample answer too)

- No "In conclusion,"
- No "In today's fast-paced world,"
- No "It is important to note that…"
- No "Throughout history, humans have always…"
- No three-item lists of the form "X, Y, and Z" used as filler
- No moralising at the reader ("we must remember to…")
- No fake balance ("there are pros and cons to both sides")

If the sample sounds like it could open a TED Talk, rewrite it.

## Schema (authoritative)

The Zod schema is at `src/lib/lessons/schema.ts`. Below is the practical
shape you need to fill in.

```json
{
  "id": "writing-a1-006",
  "level": "A1",
  "title": "Short, concrete title",
  "summary": "One-sentence pitch — used on the hub card and in index.json.",
  "tags": ["Daily life", "Routine"],
  "topic": "Short topic statement (will show as 'Topic: ...' on the page)",
  "prompt": "Specific task: what to write, how many sentences, what structures to use.",
  "minWords": 40,
  "maxWords": 120,
  "hintStarters": [
    "On weekends, I usually…",
    "My favorite thing is…"
  ],
  "hintVocab": [
    { "phrase": "relax", "meaningVi": "thư giãn" },
    { "phrase": "usually", "meaningVi": "thường", "pronunciation": "/ˈjuːʒuəli/" }
  ],
  "sampleText": "Teacher-written model answer at the target level.",
  "sampleAnnotations": [
    { "phrase": "exact phrase from sampleText", "meaningVi": "nghĩa tiếng Việt" }
  ],
  "sampleGrammarNotes": [
    {
      "title": "Present simple for habits",
      "bodyVi": "Giải thích bằng tiếng Việt.",
      "bodyEn": "Explanation in English with one example from the sample."
    }
  ],
  "sampleTranslationVi": "Bản dịch tiếng Việt đầy đủ của sampleText.",
  "mcQuestions": [
    {
      "id": "q1",
      "prompt": "Which sentence best fits the topic / sounds most natural?",
      "options": ["A", "B", "C", "D"],
      "answerIndex": 1,
      "explanation": "Short reason — point at the grammar/vocab/style feature.",
      "hint": "What feature to look for (not the answer itself)."
    }
    // … ≥10 (A1–B1) or ≥15 (B2/C1) total
  ],
  "criticalThinkingQuestion": "One open-ended reflective question (optional)."
}
```

There is **no** `format`, **no** `body`, **no** `cloze`, **no** standalone
`translationVi` or `annotations`. Writing lessons replace those with `topic`,
`prompt`, `sampleText`, `sampleAnnotations`, `sampleTranslationVi`,
`sampleGrammarNotes`, `mcQuestions`, `hintStarters`, and `hintVocab`. If
your output has a `body` field, you wrote a reading lesson by mistake.

## Hint starters

Three or more sentence frames the learner can use to begin a sentence.
Match the prompt's target structure:

- A prompt about habits → starters in present simple
  (`"On weekends, I usually…"`, `"Sometimes I…"`)
- A prompt about a past event → starters in past simple
  (`"Last summer, I…"`, `"When I was younger, I…"`)
- A prompt arguing a point → opinion frames
  (`"In my view,…"`, `"One reason is…"`, `"That said,…"`)

Starters must be **unfinished** — they end with `…` and invite continuation.
Don't write full sentences.

## Hint vocabulary

Pick words and fixed expressions the learner will need to write on this
topic. Each entry is `{ phrase, meaningVi, pronunciation? }`.

- The `phrase` does NOT need to appear in `sampleText` — it's reference
  material for the learner's own writing.
- Mix single words, collocations, and short fixed expressions.
- Include pronunciation for any word whose pronunciation is non-obvious
  from spelling, especially at A1/A2.

## Sample text (the model answer)

This is what a strong learner at this exact level would write. It must:

- Land inside the `minWords` / `maxWords` range, preferably near the middle.
- Use the target grammar from `prompt` (e.g. if the prompt says "use past
  simple", the sample is in past simple).
- Read like something a person would actually write — voice, small
  concrete detail, no platitudes.
- Be self-contained — the learner can read it once and feel "ah, that's the
  bar".

### Sample annotations

Pick the phrases inside `sampleText` that a learner would look up. Each
entry is `{ phrase, meaningVi, pronunciation? }`. The `phrase` MUST appear
verbatim in `sampleText` (case-insensitive). The annotation count threshold
is per the table above.

### Sample grammar notes

One or two notes pointing at structures the sample uses (and that the
learner is supposed to practise). At A1/A2 one note is enough; B1+ can have
two. Each note: `title`, `bodyVi` (Vietnamese explanation), `bodyEn`
(English explanation that quotes a phrase from `sampleText`).

### Sample Vietnamese translation

`sampleTranslationVi` is the full Vietnamese translation of `sampleText`.
Translate for sense, not word-by-word. Match the formality of the original.

## MC questions ("pick the best-written sentence")

The MC quiz for a writing lesson is **not** a comprehension quiz. Every
question gives 4 candidate sentences and asks the learner to pick the one
that's correct, natural, AND on-topic for this lesson.

- 4 options, `answerIndex` 0-3, no duplicate options.
- The wrong options should each fail in a *different* way:
  - one with a clear grammar error (wrong tense, wrong word order, agreement)
  - one with awkward / non-native vocabulary or collocation
  - one that's grammatical but off-topic or oddly formal/casual for the
    prompt
- The correct option uses the structure the prompt is teaching.
- `explanation` is a short reason — name the feature (e.g. "Time phrase
  first, then subject + adverb + verb.").
- `hint` directs the learner to *what* to look for, not the answer.

### Quality bar by level

- **A1/A2** — ≥10 questions. Focus on basic word order, present simple,
  adverbs of frequency, simple connectors.
- **B1** — ≥10 questions. Mix tense choice, prepositions, articles, modals.
- **B2/C1** — ≥15 questions. Include subtle register / cohesion choices,
  not just grammar errors. For C1, add questions that ask which of two
  near-paraphrases is closer to the topic, or which option uses the
  best cohesion device.

## Critical thinking question (optional)

One per lesson if it strengthens the topic. Open-ended. Should:

- Refer back to a claim or image in the prompt or sample.
- Force the learner to apply the idea to their own life.
- Not have a "right" answer.

Bad: "Do you agree?" — too thin.
Good: "Which weekend habit do you think helps you most for the week ahead,
and why?"

If a topic doesn't naturally invite reflection, omit the field rather than
adding filler.

## Procedure (follow in order)

1. **Resolve inputs.** Confirm level, count, optional topics. If user said
   "more writing lessons", default to count=5 for the current level under
   discussion.
2. **Plan the batch.** Sketch a list of `count` distinct topics with a
   one-line angle each. Vary the rhetorical mode across the batch
   (describe / narrate / argue / explain / reflect) so the learner isn't
   doing five "describe X" prompts in a row.
3. **Find next IDs.** `ls public/lessons/writing/{level}/ 2>/dev/null` →
   continue from the next NNN. IDs are zero-padded to 3 digits.
4. **Write lessons one at a time.** Each is one `Write` call producing the
   full JSON file. Do not skip fields. Verify before writing:
   - `sampleText` word count falls inside `[minWords, maxWords]`.
   - Every `sampleAnnotations[*].phrase` appears verbatim in `sampleText`.
   - `mcQuestions[*].answerIndex` actually points at the correct option.
5. **Rebuild the index.** Do not edit `index.json` by hand. Run:
   ```bash
   node scripts/rebuild-indexes.mjs
   ```
6. **Validate.** `npx tsx scripts/validate-lessons.mjs` must print
   `✓ N reading + M listening + K writing lessons validated`. If it errors,
   the message points you at the file and field. Fix and re-run.
7. **Sanity-check counts.** For each new file, confirm `mcQuestions.length`,
   `hintStarters.length`, `hintVocab.length`, and
   `sampleAnnotations.length` clear the per-level thresholds. The validator
   does not check these — it's your job.
8. **Report.** In the final user message, list the new IDs grouped by
   level, with each title and a one-line angle. Don't restate the schema.

## Common failure modes (and how to avoid them)

- **Forgot to rebuild `index.json`** → new lessons exist as files but don't
  appear in the hub. Always run step 5.
- **Sample annotation phrase not in `sampleText`** → annotation will not
  highlight anything. Search `sampleText` before listing an annotation.
- **`sampleText` outside `minWords` / `maxWords`** → silent quality bug
  (the "Word target" hint in the editor will already be wrong on the first
  click of "Show sample"). Count words manually before saving.
- **MC `answerIndex` doesn't match the option order** → validator passes
  (it only checks 0-3), but the quiz is broken. Re-read each question's
  options against the answer index before saving.
- **All four MC options are subtly the same flavor of wrong** → quiz
  becomes a trick question instead of a teaching tool. Each wrong answer
  should fail in a *different* way (grammar / vocab / register / off-topic).
- **Sample answer reads like AI exposition** → re-run the anti-AI-ism
  filter. Concrete detail beats generality.
- **Hint starters are full sentences** → they should end with `…` and
  invite the learner to continue.
- **Prompt is too vague** → a good prompt names the topic, the length,
  AND the structure to practise. "Write about your hobbies" is weak;
  "Write 5–7 sentences about a hobby you do every week. Use present
  simple and adverbs of frequency." is strong.
- **Translating idioms literally into Vietnamese** → makes
  `sampleTranslationVi` awkward. Translate for sense.

## File map for reference

- Schema: `src/lib/lessons/schema.ts` (`writingLessonSchema`,
  `writingLessonsIndexSchema`)
- TypeScript types: `src/lib/lessons/types.ts` (`WritingLesson`,
  `WritingLessonMeta`)
- Loader hooks: `src/lib/lessons/load.ts` (`useWritingLesson`,
  `useWritingLessonsIndex`)
- Hub page: `src/app/(app)/writing/page.tsx`
- Detail page: `src/app/(app)/writing/[lessonId]/page.tsx`
- LLM prompt builder (consumes `topic` + `prompt`): `src/lib/writing/prompt.ts`
- Validator script: `scripts/validate-lessons.mjs`
- Index rebuilder: `scripts/rebuild-indexes.mjs`
- Existing pilot lesson (use as style reference):
  `public/lessons/writing/a1/writing-a1-001.json`

When in doubt, open the pilot lesson at the target level (or the nearest
existing one) and match its shape and tone.
