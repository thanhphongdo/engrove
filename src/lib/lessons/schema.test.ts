import { describe, it, expect } from "vitest";
import { lessonSchema, lessonMetaSchema, lessonsIndexSchema } from "./schema";

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

describe("lessonsIndexSchema", () => {
  const meta = {
    id: "reading-a1-001",
    level: "A1",
    title: "My first day in Paris",
    summary: "A tourist arrives in Paris.",
    tags: ["Travel"],
  };

  it("accepts a valid metadata entry", () => {
    expect(() => lessonMetaSchema.parse(meta)).not.toThrow();
  });

  it("accepts an array of metadata entries", () => {
    expect(() => lessonsIndexSchema.parse([meta])).not.toThrow();
  });

  it("rejects metadata with a bad level", () => {
    expect(() => lessonMetaSchema.parse({ ...meta, level: "D1" })).toThrow();
  });
});

describe("lessonSchema cloze", () => {
  const withCloze = {
    ...valid,
    cloze: {
      template: "I {{b1}} home.",
      blanks: [
        {
          id: "b1",
          options: ["went", "go", "going", "gone"],
          answerIndex: 0,
          explanation: "Past simple.",
        },
      ],
    },
  };

  it("accepts a valid cloze", () => {
    expect(() => lessonSchema.parse(withCloze)).not.toThrow();
  });

  it("rejects when a placeholder has no matching blank", () => {
    const bad = {
      ...withCloze,
      cloze: { ...withCloze.cloze, template: "I {{missing}} home." },
    };
    expect(() => lessonSchema.parse(bad)).toThrow();
  });

  it("rejects when a blank is not referenced by the template", () => {
    const bad = {
      ...withCloze,
      cloze: {
        ...withCloze.cloze,
        blanks: [
          ...withCloze.cloze.blanks,
          {
            id: "b2",
            options: ["a", "b", "c", "d"] as [string, string, string, string],
            answerIndex: 0 as 0 | 1 | 2 | 3,
            explanation: "",
          },
        ],
      },
    };
    expect(() => lessonSchema.parse(bad)).toThrow();
  });

  it("rejects duplicate placeholder ids", () => {
    const bad = {
      ...withCloze,
      cloze: { ...withCloze.cloze, template: "{{b1}} and {{b1}}" },
    };
    expect(() => lessonSchema.parse(bad)).toThrow();
  });
});
