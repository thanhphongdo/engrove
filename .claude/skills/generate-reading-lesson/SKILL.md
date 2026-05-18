---
name: generate-reading-lesson
description: |
  Generate new reading lessons for the english-learning app. Produces JSON
  lesson files under public/lessons/reading/{level}/, then rebuilds the
  shared index.json. Each lesson carries a passage (paragraph or dialogue),
  Vietnamese annotations + translation, a multiple-choice quiz, and a
  fill-in-the-blanks (cloze) quiz that covers the entire body. Use when
  asked to "add reading lessons", "generate more A1/A2/B1/B2/C1 lessons",
  "scale up the reading content", or "/generate-reading-lesson".
triggers:
  - generate reading lesson
  - generate reading lessons
  - add reading lesson
  - add reading lessons
  - more reading lessons
  - scale up reading content
---

# generate-reading-lesson

You are producing reading-comprehension lessons for a Next.js app that loads
lessons from `public/lessons/reading/`. The schema is enforced by Zod at
runtime — invalid JSON will fail to load. Treat the validator as the source
of truth: if `npx tsx scripts/validate-lessons.mjs` passes, you are done.

## Inputs you should resolve before writing

Ask the user only what is missing; otherwise use the defaults below.

| Input | Default | Notes |
|---|---|---|
| `level` | required | `A1`, `A2`, `B1`, `B2`, or `C1` |
| `count` | 5 | Number of new lessons in this batch |
| `topics` | none — invent | Optional seed list of topics |
| `formats` | mixed | Optional override — see "Formats" below |

For multi-level batches (e.g. "generate 5 of each"), run the procedure once
per level so quality stays even.

## Where files go

```
public/lessons/reading/
├── index.json                     ← metadata for ALL lessons (rebuild last)
├── a1/reading-a1-001.json         ← one file per lesson
├── a1/reading-a1-002.json
├── …
└── c1/reading-c1-050.json
```

### Picking the next ID

For each level you write to, list existing files and continue from
`max(existing) + 1`. The ID convention is **`reading-{level}-NNN`** with the
level lowercased in the file path but uppercased in the JSON's `level`
field. The level is parsed back from the ID at load time (see
`src/lib/lessons/load.ts`), so the ID format is load-bearing — don't deviate.

```bash
ls public/lessons/reading/a1/ | sort | tail -3   # find highest existing
```

## Per-level constraints (hard requirements)

| Level | Body word count | MC questions | Cloze blanks |
|---|---|---|---|
| A1 | 150–250 | ≥10 | ≥10 |
| A2 | 150–250 | ≥10 | ≥10 |
| B1 | 350–500 | ≥10 | ≥10 |
| B2 | 350–500 | ≥15 | ≥15 |
| C1 | 600–800 | ≥15 | ≥15 |

Linguistic register must match the level. Use CEFR descriptors as your check:
- A1/A2 — present and past simple, common vocab, short sentences, concrete topics expressed simply
- B1 — present perfect, conditionals, modals, abstract topics introduced gently
- B2 — varied grammar (cleft, passive, complex concession), abstract argument
- C1 — sophisticated register, nuanced argument, hedging and concession patterns

A "deep" idea at A1 must still be expressed in A1 grammar. Adjust the
*expression*, not the *idea*.

## Formats

Each lesson picks ONE of:

1. **Paragraph** — `format: "paragraph"`, `body: string`. Used for narrative
   prose, journalistic reports, blog posts, **and formal correspondence**
   (letters, editorials, open letters). Use `\n\n` for paragraph breaks.
2. **Dialogue** — `format: "dialogue"`, `body: DialogueTurn[]` (each turn:
   `{ speaker, text }`). Used for podcast transcripts, debates,
   conversations between experts, neighbours, etc.

Mix formats across the batch — don't give the user five dialogues in a row.
A typical mix for a 5-lesson batch: 3 paragraph (of varied sub-types:
narrative / essay / letter or editorial), 2 dialogue.

## Topic selection (the "Deep" factor)

Avoid clichés. **Banned topics** for AI-generated content because they're
the default well: "benefits of exercise", "the history of the internet",
"the importance of sleep", "AI is changing the world", "social media has
two sides", "the four seasons", "my dream job".

Instead, aim for topics with built-in tension: a paradox, a moral
dilemma, a hidden perspective, a "the obvious answer is wrong" angle.

Productive theme veins:
- urban psychology / sociology of public space
- obscure history (a craft dying out, a particular bridge, a forgotten letter)
- philosophy of attention, memory, recognition, time
- sustainable technology (concrete, not slogan)
- ethics of preservation (what we keep, what we let go)
- the dignity of "ordinary" work or "ordinary" lives
- the way small habits change a life over years
- relationships across age, language, role, or distance

For dialogues, give the two speakers **distinct, internally-consistent
viewpoints** that each acknowledge something true. Avoid "X says yes, Y says
no". Better: "X focuses on individuals, Y focuses on systems; both are
partly right."

## Anti-AI-ism filter

Before writing, internalise the bans:

- No "In conclusion,"
- No "In today's fast-paced world,"
- No "It is important to note that…"
- No "Throughout history, humans have always…"
- No three-item lists of the form "X, Y, and Z" used as filler
- No moralising at the reader ("we must remember to…")
- No fake balance ("there are pros and cons to both sides")

If a sentence sounds like it could open a TED Talk, rewrite it.

## Schema (authoritative)

The Zod schema is at `src/lib/lessons/schema.ts`. Below is the practical
shape you need to fill in.

```json
{
  "id": "reading-a1-006",
  "level": "A1",
  "title": "Short, concrete title",
  "summary": "One-sentence pitch — used on the hub card and in index.json.",
  "format": "paragraph",
  "body": "Full passage. Use \\n\\n for paragraph breaks.",
  "tags": ["Philosophy", "City life"],
  "annotations": [
    { "phrase": "exact phrase from body", "meaningVi": "nghĩa tiếng Việt" },
    { "phrase": "another", "meaningVi": "…", "pronunciation": "/optional/" }
  ],
  "grammarNotes": [
    {
      "title": "Past simple",
      "bodyVi": "Giải thích bằng tiếng Việt.",
      "bodyEn": "Explanation in English with an example from the passage."
    }
  ],
  "translationVi": "Bản dịch tiếng Việt đầy đủ của body.",
  "questions": [
    {
      "id": "q1",
      "prompt": "Comprehension question?",
      "options": ["A", "B", "C", "D"],
      "answerIndex": 0,
      "explanation": "'Direct quote or paraphrase from passage.'",
      "hint": "Where to look in the passage."
    }
    // … ≥10 (A1-B1) or ≥15 (B2-C1) total
  ],
  "cloze": {
    "template": "Full body with chosen words replaced by {{b1}}, {{b2}}, …",
    "blanks": [
      {
        "id": "b1",
        "options": ["correct", "wrong1", "wrong2", "wrong3"],
        "answerIndex": 0,
        "explanation": "Why the answer is correct."
      }
      // … ≥10 (A1-B1) or ≥15 (B2-C1) total
    ]
  },
  "criticalThinkingQuestion": "One open-ended reflective question."
}
```

For a **dialogue** lesson the only changes are:

```json
{
  "format": "dialogue",
  "body": [
    { "speaker": "Anna", "text": "First turn." },
    { "speaker": "Ben", "text": "Reply." }
  ],
  "cloze": {
    "template": "Anna: First {{b1}}.\nBen: Reply with {{b2}}.",
    "blanks": [ … ]
  }
}
```

The cloze template stays a string even for dialogues — render
`Speaker: text` on each line, separated by `\n`. The cloze block renderer
honours `whitespace: pre-line`, so newlines display correctly.

## Cloze rules (the validator enforces these)

1. **Template covers the full body.** Take the lesson's body and replace
   selected words/phrases with `{{bN}}` placeholders. The cloze is the
   passage, not a summary.
2. **Every `{{bN}}` placeholder must have a matching blank** in the
   `blanks` array, and every blank `id` must appear once in the template.
3. **Placeholder IDs are unique within a lesson** — `{{b1}}` cannot appear
   twice.
4. **Each blank has exactly 4 options.** No duplicates. Distractors should
   be plausible — same part of speech as the answer, drawn from the
   passage's vocabulary range.
5. **`answerIndex` is 0-3.**
6. **Aim the blanks at the lesson's teaching point** — grammar from the
   `grammarNotes`, key vocabulary from `annotations`, and a few content
   words that reward reading comprehension.

A common bug: placing a blank in the *middle* of a fixed phrase (e.g.
`{{b1}} morning` where only one answer makes sense). Prefer blanks where 2-3
distractors are grammatically possible but only one is contextually right.

## MC question rules

- 4 options, `answerIndex` 0-3, no duplicate options.
- Mix question types: factual recall (5-6), inference / paraphrase (2-3),
  vocabulary in context (1-2), main idea / tone (1-2).
- For B2/C1, add questions that ask **what the writer is NOT claiming**, or
  which of two paraphrases is closer — this is what makes a quiz feel
  appropriately hard at higher levels.
- `explanation` should ideally include a short quoted phrase from the
  passage so the student can verify.
- `hint` directs the student to a region of the passage (e.g. "Paragraph
  3" or "Look at Khoa's last line"), not the answer itself.

## Annotations

5 phrases is the comfortable number for A1-B1; B2/C1 can go to 5-7.

- The `phrase` must appear **verbatim** in the body (case-insensitive). Don't
  annotate a phrase that isn't in the passage.
- `meaningVi` is the Vietnamese gloss. Use the level-appropriate register.
- `pronunciation` is optional; include it for words whose pronunciation is
  not obvious from spelling, especially at A1/A2.

## Vietnamese translation

`translationVi` is the full Vietnamese translation of `body`. For dialogue
lessons, render as `Speaker: text` on each line separated by `\n`. Match the
formality of the original.

## Grammar notes

One note per lesson is enough at A1/A2 (where the body uses a small set of
structures). B1+ can have one note focused on a specific structure the
passage showcases (e.g. second conditional, past perfect, cleft sentences,
inversion).

Each note: `title`, `bodyVi` (Vietnamese explanation), `bodyEn` (English
explanation with at least one example phrase quoted from the passage).

## Critical thinking question

One per lesson. Open-ended. Should:
- Refer back to a specific image or claim from the passage.
- Force the reader to apply the idea to their own life or to a related
  domain.
- Not have a "right" answer.

Bad: "Do you agree?" — too thin.
Good: "Mrs Linh says the tree, the bird, and she were there first. When we
move to a new place, what 'right' do we have to ask others — even nature
— to change for us?"

## Procedure (follow in order)

1. **Resolve inputs.** Confirm level, count, optional topics. If user said
   "more lessons", default to count=5 for the current level under
   discussion.
2. **Plan the batch.** Sketch a list of `count` distinct topics with a one-
   line angle each (the paradox/dilemma/twist). Decide formats per lesson
   so the batch has variety.
3. **Find next IDs.** `ls public/lessons/reading/{level}/` → continue from
   the next NNN. IDs are zero-padded to 3 digits.
4. **Write lessons one at a time.** Each is one `Write` call producing the
   full JSON file. Do not skip fields. Make sure the cloze template equals
   the body with placeholders substituted in (or, for dialogues, the
   `Speaker: text\n…` rendering with placeholders).
5. **Rebuild the index.** Do not edit `index.json` by hand. Run:
   ```bash
   node -e '
     const fs = require("fs"), path = require("path");
     const base = "public/lessons/reading";
     const levels = ["a1","a2","b1","b2","c1"];
     const out = [];
     for (const lvl of levels) {
       const dir = path.join(base, lvl);
       const files = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort();
       for (const f of files) {
         const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
         out.push({ id: j.id, level: j.level, title: j.title, summary: j.summary, tags: j.tags });
       }
     }
     fs.writeFileSync(path.join(base, "index.json"), JSON.stringify(out, null, 2));
     console.log("wrote", out.length, "entries");
   '
   ```
6. **Validate.** `npx tsx scripts/validate-lessons.mjs` must print
   `✓ N lessons + index validated`. If it errors, the message points you at
   the file and field. Fix and re-run.
7. **Sanity-check counts.** For each new file, confirm `questions.length`
   and `cloze.blanks.length` clear the per-level threshold. The validator
   does not check this — it's your job.
8. **Report.** In the final user message, list the new IDs grouped by
   level, with each title and a one-line angle. Don't restate the schema.

## Common failure modes (and how to avoid them)

- **Forgot to rebuild `index.json`** → new lessons exist as files but don't
  appear in the hub. Always run step 5.
- **Cloze placeholder without matching blank** (or vice versa) → validator
  fails with a clear message. Reread the validator output; do not retype
  the whole file.
- **Duplicate placeholder `{{b3}}` appearing twice** → validator fails. Use
  `{{b3a}}` and `{{b3b}}` or just renumber.
- **Wrong body word count for level** → silent quality bug. Count words in
  the body, not in the JSON.
- **MC `answerIndex` doesn't match the option order** → validator passes
  (it only checks 0-3), but the quiz is broken. Re-read each question
  before submitting.
- **`phrase` in annotations not present in body** → annotation will not
  highlight anything. Search the body string before listing an annotation.
- **Translating idioms literally into Vietnamese** → makes the
  `translationVi` awkward. Translate for sense, not word-by-word.
- **Same topic theme twice in one batch** → batches feel monotonous. Vary
  domain (history / urban / philosophy / craft / relationship).

## File map for reference

- Schema: `src/lib/lessons/schema.ts`
- TypeScript types: `src/lib/lessons/types.ts`
- Loader hooks: `src/lib/lessons/load.ts`
- Cloze template parser: `src/lib/lessons/cloze-template.ts`
- Hub page: `src/app/(app)/reading/page.tsx`
- Detail page: `src/app/(app)/reading/[lessonId]/page.tsx`
- Validator script: `scripts/validate-lessons.mjs`
- Existing pilot lessons (use as style reference): `public/lessons/reading/{level}/`

When in doubt, open one of the pilot lessons at the target level and match
its shape and tone.
