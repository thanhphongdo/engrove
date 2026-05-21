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
