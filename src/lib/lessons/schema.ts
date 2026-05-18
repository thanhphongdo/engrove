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
