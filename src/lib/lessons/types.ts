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
};
