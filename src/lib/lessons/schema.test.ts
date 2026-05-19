import { describe, it, expect } from "vitest";
import { lessonSchema, lessonMetaSchema, lessonsIndexSchema } from "./schema";
import { listeningLessonSchema, listeningLessonMetaSchema, listeningLessonsIndexSchema } from "./schema";

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

const validListening = {
  id: "listening-a1-001",
  level: "A1",
  title: "Quiet street",
  summary: "A morning walk.",
  format: "paragraph",
  body: "I walked down the street. It was quiet.",
  tags: ["City life"],
  annotations: [{ phrase: "quiet", meaningVi: "yên tĩnh" }],
  grammarNotes: [],
  translationVi: "Tôi đi xuống đường. Trời yên tĩnh.",
  questions: [
    {
      id: "q1",
      prompt: "What was the street like?",
      options: ["Loud", "Quiet", "Busy", "Empty"],
      answerIndex: 1,
      explanation: "It was quiet.",
      hint: "Last sentence.",
    },
  ],
  accents: ["en-US"],
  voices: {
    Narrator: { sex: "female", age: "adult", accent: "en-US", edgeVoice: "en-US-AriaNeural" },
  },
  sentences: [
    { id: "s1", speaker: "Narrator", text: "I walked down the street." },
    { id: "s2", speaker: "Narrator", text: "It was quiet." },
  ],
  audio: {
    cdnBase: "https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main/listening-a1-001",
    manifestVersion: 1,
  },
};

describe("listeningLessonSchema base", () => {
  it("accepts a valid listening lesson", () => {
    expect(() => listeningLessonSchema.parse(validListening)).not.toThrow();
  });
  it("rejects when voices is missing", () => {
    const { voices: _v, ...bad } = validListening;
    expect(() => listeningLessonSchema.parse(bad)).toThrow();
  });
  it("rejects when sentences is empty", () => {
    expect(() => listeningLessonSchema.parse({ ...validListening, sentences: [] })).toThrow();
  });
  it("rejects when accents contains an unknown locale", () => {
    expect(() => listeningLessonSchema.parse({ ...validListening, accents: ["en-IE"] })).toThrow();
  });
});

describe("listeningLessonSchema cross-refinements", () => {
  const base = validListening;

  it("rejects when a sentence speaker is not in voices", () => {
    const bad = {
      ...base,
      sentences: [
        ...base.sentences,
        { id: "s3", speaker: "Ghost", text: "Oo." },
      ],
    };
    expect(() => listeningLessonSchema.parse(bad)).toThrow(/speaker.*Ghost.*voices/i);
  });

  it("rejects when sentence ids are not contiguous s1..sN", () => {
    const bad = {
      ...base,
      sentences: [
        { id: "s1", speaker: "Narrator", text: "I walked down the street." },
        { id: "s3", speaker: "Narrator", text: "It was quiet." },
      ],
    };
    expect(() => listeningLessonSchema.parse(bad)).toThrow(/contiguous/i);
  });

  it("rejects when paragraph sentences do not concatenate back to body", () => {
    const bad = {
      ...base,
      sentences: [
        { id: "s1", speaker: "Narrator", text: "I walked down the street." },
        { id: "s2", speaker: "Narrator", text: "Something else entirely." },
      ],
    };
    expect(() => listeningLessonSchema.parse(bad)).toThrow(/concatenat/i);
  });

  it("rejects when dialogue sentence groups do not reproduce turn texts", () => {
    const dialogue = {
      ...base,
      format: "dialogue" as const,
      body: [
        { speaker: "Anna", text: "Hello there." },
        { speaker: "Ben", text: "Hi Anna." },
      ],
      voices: {
        Anna: { sex: "female", age: "adult", accent: "en-US", edgeVoice: "en-US-AriaNeural" },
        Ben:  { sex: "male",   age: "adult", accent: "en-US", edgeVoice: "en-US-GuyNeural"  },
      },
      sentences: [
        { id: "s1", speaker: "Anna", text: "Hello there." },
        { id: "s2", speaker: "Ben",  text: "Goodbye Anna." },
      ],
    };
    expect(() => listeningLessonSchema.parse(dialogue)).toThrow(/dialogue.*turn/i);
  });

  it("rejects when accents does not equal the unique union of voices", () => {
    const bad = { ...base, accents: ["en-US", "en-GB"] as const };
    expect(() => listeningLessonSchema.parse(bad)).toThrow(/accents.*union/i);
  });

  it("accepts dialogue where same speaker has multiple consecutive sentences for one turn", () => {
    const dialogue = {
      ...base,
      format: "dialogue" as const,
      body: [
        { speaker: "Anna", text: "Hello there. How are you?" },
        { speaker: "Ben", text: "Hi Anna." },
      ],
      voices: {
        Anna: { sex: "female", age: "adult", accent: "en-US", edgeVoice: "en-US-AriaNeural" },
        Ben:  { sex: "male",   age: "adult", accent: "en-US", edgeVoice: "en-US-GuyNeural"  },
      },
      sentences: [
        { id: "s1", speaker: "Anna", text: "Hello there." },
        { id: "s2", speaker: "Anna", text: "How are you?" },
        { id: "s3", speaker: "Ben",  text: "Hi Anna." },
      ],
    };
    expect(() => listeningLessonSchema.parse(dialogue)).not.toThrow();
  });
});

describe("listeningLessonMetaSchema", () => {
  const meta = {
    id: "listening-a1-001",
    level: "A1",
    title: "Quiet street",
    summary: "A morning walk.",
    tags: ["City life"],
    accents: ["en-US"],
    totalDurationMs: 4200,
    sentenceCount: 2,
  };
  it("accepts a valid metadata entry", () => {
    expect(() => listeningLessonMetaSchema.parse(meta)).not.toThrow();
  });
  it("accepts an array of metadata entries", () => {
    expect(() => listeningLessonsIndexSchema.parse([meta])).not.toThrow();
  });
});
