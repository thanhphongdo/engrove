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
