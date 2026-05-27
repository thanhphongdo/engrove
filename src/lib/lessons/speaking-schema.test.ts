import { describe, it, expect } from "vitest";
import { speakingLessonSchema, speakingLessonMetaSchema } from "./speaking-schema";

const VALID_LESSON = {
  id: "speaking-a1-001",
  level: "A1",
  title: "Ordering coffee",
  summary: "A customer orders an iced latte at a café.",
  topic: "Ordering at a café",
  tags: ["Daily life", "Café"],
  characters: ["Customer", "Barista"] as [string, string],
  voices: {
    Customer: { sex: "female", age: "adult", accent: "en-US", edgeVoice: "en-US-JennyNeural" },
    Barista:  { sex: "male",   age: "adult", accent: "en-US", edgeVoice: "en-US-GuyNeural" },
  },
  body: [
    { speaker: "Customer", text: "Hi, can I get an iced latte, please?" },
    { speaker: "Barista",  text: "Sure. What size?" },
  ],
  sentences: [
    { id: "s1", speaker: "Customer", text: "Hi, can I get an iced latte, please?" },
    { id: "s2", speaker: "Barista",  text: "Sure." },
    { id: "s3", speaker: "Barista",  text: "What size?" },
  ],
  hintStarters: [{ id: "h1", text: "Could I have a …, please?" }],
  hintVocab: [{ id: "v1", phrase: "iced latte", meaningVi: "cà phê sữa đá", pronunciation: "/aɪst ˈlɑː.teɪ/" }],
  annotations: [{ phrase: "iced latte", meaningVi: "cà phê sữa đá", pronunciation: "/aɪst ˈlɑː.teɪ/" }],
  grammarNotes: [{ title: "Polite requests", bodyVi: "Dùng 'Can I…'", bodyEn: "Use 'Can I…'" }],
  translationVi: "Khách: Cho tôi cà phê sữa đá…",
  criticalThinkingQuestion: "Why does tone matter when ordering?",
  audio: { cdnBase: "https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main/speaking-a1-001", manifestVersion: 1 },
  accents: ["en-US"] as ["en-US"],
};

describe("speakingLessonSchema", () => {
  it("accepts a valid lesson", () => {
    expect(speakingLessonSchema.safeParse(VALID_LESSON).success).toBe(true);
  });

  it("rejects a character not in voices", () => {
    const bad = { ...VALID_LESSON, characters: ["Customer", "Unknown"] as [string, string] };
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects non-contiguous sentence ids", () => {
    const bad = { ...VALID_LESSON, sentences: [
      { id: "s1", speaker: "Customer", text: "Hi, can I get an iced latte, please?" },
      { id: "s3", speaker: "Barista",  text: "Sure." },
      { id: "s4", speaker: "Barista",  text: "What size?" },
    ]};
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects sentences that don't match body turns", () => {
    const bad = { ...VALID_LESSON, sentences: [
      { id: "s1", speaker: "Customer", text: "Hello there." },
      { id: "s2", speaker: "Barista",  text: "Sure." },
      { id: "s3", speaker: "Barista",  text: "What size?" },
    ]};
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects non-sequential hintStarters ids", () => {
    const bad = { ...VALID_LESSON, hintStarters: [{ id: "h2", text: "test" }] };
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects non-sequential hintVocab ids", () => {
    const bad = { ...VALID_LESSON, hintVocab: [{ id: "v2", phrase: "x", meaningVi: "y", pronunciation: "z" }] };
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects non-en-US voices", () => {
    const bad = {
      ...VALID_LESSON,
      voices: { ...VALID_LESSON.voices, Barista: { sex: "male", age: "adult", accent: "en-GB", edgeVoice: "en-GB-RyanNeural" } },
    };
    const r = speakingLessonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });
});

describe("speakingLessonMetaSchema", () => {
  it("accepts valid meta with turnCount and sentenceCount", () => {
    const meta = {
      id: "speaking-a1-001", level: "A1", title: "T", summary: "S", topic: "X",
      tags: ["a"], characters: ["Customer", "Barista"] as [string, string],
      sentenceCount: 3, turnCount: 2,
    };
    expect(speakingLessonMetaSchema.safeParse(meta).success).toBe(true);
  });
});
