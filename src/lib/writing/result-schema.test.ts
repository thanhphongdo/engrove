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
