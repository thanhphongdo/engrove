import { z } from "zod";
import { extractPlaceholderIds } from "./cloze-template";

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

const clozeBlank = z.object({
  id: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  answerIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanation: z.string(),
});

const cloze = z
  .object({
    template: z.string().min(1),
    blanks: z.array(clozeBlank).min(1),
  })
  .superRefine((value, ctx) => {
    const placeholderIds = extractPlaceholderIds(value.template);
    const blankIds = value.blanks.map((b) => b.id);

    // every placeholder has a blank
    for (const id of placeholderIds) {
      if (!blankIds.includes(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Placeholder {{${id}}} has no matching blank`,
        });
      }
    }
    // every blank is referenced
    for (const id of blankIds) {
      if (!placeholderIds.includes(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Blank "${id}" is not referenced in the template`,
        });
      }
    }
    // placeholders are unique
    const seen = new Set<string>();
    for (const id of placeholderIds) {
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Placeholder {{${id}}} appears more than once`,
        });
      }
      seen.add(id);
    }
    // blank ids are unique
    const blankIdSet = new Set<string>();
    for (const id of blankIds) {
      if (blankIdSet.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate blank id: ${id}`,
        });
      }
      blankIdSet.add(id);
    }
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
    cloze: cloze.optional(),
    criticalThinkingQuestion: z.string().optional(),
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
    cloze: cloze.optional(),
    criticalThinkingQuestion: z.string().optional(),
  }),
]);

export const lessonMetaSchema = z.object({
  id: z.string().min(1),
  level: cefrLevel,
  title: z.string().min(1),
  summary: z.string(),
  tags: z.array(z.string()),
});

export const lessonsIndexSchema = z.array(lessonMetaSchema);

const accent = z.enum(["en-US", "en-GB", "en-AU"]);

const voiceProfile = z.object({
  sex: z.enum(["female", "male"]),
  age: z.enum(["child", "teen", "adult", "senior"]),
  accent,
  edgeVoice: z.string().min(1),
});

const sentence = z.object({
  id: z.string().min(1),
  speaker: z.string().min(1),
  text: z.string().min(1),
  durationMs: z.number().int().nonnegative().optional(),
});

const audioMeta = z.object({
  cdnBase: z.string().url(),
  manifestVersion: z.number().int().positive(),
});

const listeningCommonFields = {
  accents: z.array(accent).min(1),
  totalDurationMs: z.number().int().nonnegative().optional(),
  voices: z.record(z.string().min(1), voiceProfile),
  sentences: z.array(sentence).min(1),
  audio: audioMeta,
};

function normalizeForCompare(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const listeningBase = z.discriminatedUnion("format", [
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
    cloze: cloze.optional(),
    criticalThinkingQuestion: z.string().optional(),
    ...listeningCommonFields,
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
    cloze: cloze.optional(),
    criticalThinkingQuestion: z.string().optional(),
    ...listeningCommonFields,
  }),
]);

export const listeningLessonSchema = listeningBase.superRefine((value, ctx) => {
  // Invariant 1: every sentence speaker exists in voices.
  const voiceKeys = new Set(Object.keys(value.voices));
  for (const s of value.sentences) {
    if (!voiceKeys.has(s.speaker)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sentences"],
        message: `Sentence ${s.id}: speaker "${s.speaker}" is not in voices`,
      });
    }
  }

  // Invariant 2: sentence ids are contiguous s1..sN.
  for (let i = 0; i < value.sentences.length; i++) {
    const expected = `s${i + 1}`;
    if (value.sentences[i].id !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sentences", i, "id"],
        message: `Expected sentence id "${expected}" (sentence ids must be contiguous s1..sN), got "${value.sentences[i].id}"`,
      });
      break;
    }
  }

  // Invariant 3: sentences ↔ body.
  if (value.format === "paragraph") {
    const reconstructed = normalizeForCompare(value.sentences.map((s) => s.text).join(" "));
    const expected = normalizeForCompare(value.body);
    if (reconstructed !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sentences"],
        message: "Paragraph sentences do not concatenate back to body",
      });
    }
  } else {
    // group consecutive same-speaker sentences and compare to turns
    type Group = { speaker: string; text: string };
    const groups: Group[] = [];
    for (const s of value.sentences) {
      const last = groups[groups.length - 1];
      if (last && last.speaker === s.speaker) {
        last.text = normalizeForCompare(last.text + " " + s.text);
      } else {
        groups.push({ speaker: s.speaker, text: normalizeForCompare(s.text) });
      }
    }
    if (groups.length !== value.body.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sentences"],
        message: `Dialogue sentence groups (${groups.length}) do not match number of turns (${value.body.length})`,
      });
    } else {
      for (let i = 0; i < groups.length; i++) {
        const turn = value.body[i];
        if (groups[i].speaker !== turn.speaker || groups[i].text !== normalizeForCompare(turn.text)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["sentences"],
            message: `Dialogue turn ${i + 1} (${turn.speaker}) does not match its sentence group`,
          });
        }
      }
    }
  }

  // Invariant 4: accents equals unique union of voices[*].accent in first-appearance order.
  const seen = new Set<string>();
  const derivedAccents: string[] = [];
  for (const v of Object.values(value.voices)) {
    if (!seen.has(v.accent)) {
      seen.add(v.accent);
      derivedAccents.push(v.accent);
    }
  }
  if (
    value.accents.length !== derivedAccents.length ||
    value.accents.some((a, i) => a !== derivedAccents[i])
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["accents"],
      message: `accents field [${value.accents.join(",")}] must equal the first-appearance union of voices[*].accent [${derivedAccents.join(",")}]`,
    });
  }
});

export const listeningLessonMetaSchema = z.object({
  id: z.string().min(1),
  level: cefrLevel,
  title: z.string().min(1),
  summary: z.string(),
  tags: z.array(z.string()),
  accents: z.array(accent).min(1),
  totalDurationMs: z.number().int().nonnegative().optional(),
  sentenceCount: z.number().int().positive(),
});

export const listeningLessonsIndexSchema = z.array(listeningLessonMetaSchema);

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
