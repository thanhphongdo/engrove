import { describe, it, expect } from "vitest";
import { lessonSchema, lessonsFileSchema } from "./schema";

const valid = {
  id: "reading-a1-001",
  level: "A1",
  title: "My first day in Paris",
  summary: "A tourist arrives in Paris.",
  format: "paragraph",
  body: "Yesterday I arrived in Paris. The airport was busy.",
  tags: ["Travel"],
  annotations: [{ phrase: "airport", meaningVi: "sân bay" }],
  grammarNotes: [],
  translationVi: "Hôm qua tôi đến Paris. Sân bay rất đông.",
  questions: [
    {
      id: "q1",
      prompt: "Where did the writer arrive?",
      options: ["Paris", "London", "Rome", "Berlin"],
      answerIndex: 0,
      explanation: "The first sentence says so.",
      hint: "Look at sentence 1.",
    },
  ],
};

describe("lessonSchema", () => {
  it("accepts a valid lesson", () => {
    expect(() => lessonSchema.parse(valid)).not.toThrow();
  });
  it("rejects a lesson with a level outside A1-C1", () => {
    expect(() => lessonSchema.parse({ ...valid, level: "D1" })).toThrow();
  });
  it("rejects a question with fewer than 4 options", () => {
    const bad = { ...valid, questions: [{ ...valid.questions[0], options: ["a", "b", "c"] }] };
    expect(() => lessonSchema.parse(bad)).toThrow();
  });
  it("rejects answerIndex outside 0-3", () => {
    const bad = { ...valid, questions: [{ ...valid.questions[0], answerIndex: 5 }] };
    expect(() => lessonSchema.parse(bad)).toThrow();
  });
  it("accepts a dialogue-format lesson", () => {
    const dialogue = {
      ...valid,
      format: "dialogue",
      body: [
        { speaker: "Anna", text: "Hello!" },
        { speaker: "Ben", text: "Hi Anna." },
      ],
    };
    expect(() => lessonSchema.parse(dialogue)).not.toThrow();
  });
});

describe("lessonsFileSchema", () => {
  it("accepts an array of lessons", () => {
    expect(() => lessonsFileSchema.parse([valid])).not.toThrow();
  });
});
