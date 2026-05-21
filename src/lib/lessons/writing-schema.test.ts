import { describe, it, expect } from "vitest";
import { writingLessonSchema, writingLessonsIndexSchema } from "./schema";

const validLesson = {
  id: "writing-a1-001",
  level: "A1" as const,
  title: "My favorite weekend",
  summary: "Write about what you do on weekends.",
  tags: ["Daily life"],
  topic: "My favorite weekend",
  prompt: "Write 5–7 sentences about what you usually do on weekends.",
  minWords: 40,
  maxWords: 120,
  hintStarters: ["On weekends, I usually…", "My favorite thing is…"],
  hintVocab: [
    { phrase: "relax", meaningVi: "thư giãn" },
    { phrase: "weekend", meaningVi: "cuối tuần", pronunciation: "/ˈwiːkend/" },
  ],
  sampleText: "On weekends, I usually relax at home...",
  sampleAnnotations: [{ phrase: "relax", meaningVi: "thư giãn" }],
  sampleGrammarNotes: [
    { title: "Present simple", bodyVi: "Dùng hiện tại đơn cho thói quen.", bodyEn: "Use present simple for habits." },
  ],
  sampleTranslationVi: "Vào cuối tuần, tôi thường thư giãn ở nhà...",
  mcQuestions: [
    {
      id: "q1",
      prompt: "Which sentence best describes a weekend habit?",
      options: ["I went home.", "I usually relax at home.", "Relax I home.", "I home relax."],
      answerIndex: 1,
      explanation: "Present simple + adverb of frequency.",
      hint: "Look for the adverb 'usually'.",
    },
  ],
};

describe("writingLessonSchema", () => {
  it("parses a valid writing lesson", () => {
    expect(() => writingLessonSchema.parse(validLesson)).not.toThrow();
  });

  it("rejects an empty title", () => {
    expect(() =>
      writingLessonSchema.parse({ ...validLesson, title: "" }),
    ).toThrow();
  });

  it("requires at least one mcQuestion", () => {
    expect(() =>
      writingLessonSchema.parse({ ...validLesson, mcQuestions: [] }),
    ).toThrow();
  });
});

describe("writingLessonsIndexSchema", () => {
  it("parses an array of metas", () => {
    const meta = {
      id: "writing-a1-001",
      level: "A1" as const,
      title: "My favorite weekend",
      summary: "Write about what you do on weekends.",
      tags: ["Daily life"],
      topic: "My favorite weekend",
    };
    expect(() => writingLessonsIndexSchema.parse([meta])).not.toThrow();
  });
});
