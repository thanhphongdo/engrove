export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1";
export type DialogueTurn = { speaker: string; text: string };
export type Annotation = {
  phrase: string;
  meaningVi: string;
  pronunciation?: string;
  exampleEn?: string;
};
export type GrammarNote = { title: string; bodyVi: string; bodyEn: string };
export type Question = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
  hint: string;
};
export type ClozeBlank = {
  id: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
};
export type ClozeQuiz = {
  /** Paragraph with {{blank-id}} placeholders, e.g. "I {{b1}} to Paris." */
  template: string;
  blanks: ClozeBlank[];
};
export type Lesson = {
  id: string;
  level: CefrLevel;
  title: string;
  summary: string;
  format: "paragraph" | "dialogue";
  body: string | DialogueTurn[];
  tags: string[];
  annotations: Annotation[];
  grammarNotes: GrammarNote[];
  translationVi: string;
  questions: Question[];
  cloze?: ClozeQuiz;
  criticalThinkingQuestion?: string;
};

export type LessonMeta = {
  id: string;
  level: CefrLevel;
  title: string;
  summary: string;
  tags: string[];
};

export type Accent = "en-US" | "en-GB" | "en-AU";

export type VoiceProfile = {
  sex: "female" | "male";
  age: "child" | "teen" | "adult" | "senior";
  accent: Accent;
  edgeVoice: string;
};

export type Sentence = {
  id: string;
  speaker: string;
  text: string;
  durationMs?: number;
};

export type ListeningLesson = Lesson & {
  accents: Accent[];
  totalDurationMs?: number;
  voices: Record<string, VoiceProfile>;
  sentences: Sentence[];
  audio: { cdnBase: string; manifestVersion: number };
};

export type ListeningLessonMeta = LessonMeta & {
  accents: Accent[];
  totalDurationMs?: number;
  sentenceCount: number;
};
