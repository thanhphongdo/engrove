import type { AnswerRow } from "@/lib/lessons/score";

export type Profile = { id: string; name: string; createdAt: number };

export type HintToggles = {
  vocabVi: boolean;
  grammar: boolean;
  passageTranslation: boolean;
  perQuestionHint: boolean;
};

export type DetailLayout = "two-column" | "stacked";

export type Preferences = {
  profileId: string;
  hintToggles: HintToggles;
  detailLayout: DetailLayout;
  activeProfileId: string;
  /** Content zoom multiplier (1 = browser default). Range 0.9–1.5 in steps of 0.1. */
  contentZoom: number;
};

export type Attempt = {
  id: string;
  profileId: string;
  lessonId: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  /** Combined score (mcScore + clozeScore). */
  score: number;
  /** Combined total (mcTotal + clozeTotal). */
  total: number;
  mcScore: number;
  mcTotal: number;
  clozeScore: number;
  clozeTotal: number;
  /** MC picks. */
  answers: AnswerRow[];
  /** Present only when the lesson had a cloze quiz. */
  clozeAnswers?: AnswerRow[];
};

export type Draft = {
  profileId: string;
  lessonId: string;
  /** MC picks keyed by question id. */
  answers: Record<string, number>;
  /** Cloze picks keyed by blank id. */
  clozePicks: Record<string, number>;
  durationMs: number;
  updatedAt: number;
};

export type Bookmark = {
  profileId: string;
  lessonId: string;
  createdAt: number;
};

export type VocabEntry = {
  id: string;
  profileId: string;
  phrase: string;
  /** Lowercased copy of `phrase`; serves the case-insensitive dedup index. */
  phraseLower: string;
  meaningVi: string;
  pronunciation?: string;
  exampleEn?: string;
  sourceLessonId: string;
  addedAt: number;
};

export type Note = {
  profileId: string;
  lessonId: string;
  text: string;
  updatedAt: number;
};

export const DEFAULT_HINT_TOGGLES: HintToggles = {
  vocabVi: false,
  grammar: false,
  passageTranslation: false,
  perQuestionHint: false,
};

export const DEFAULT_CONTENT_ZOOM = 1.1;
export const MIN_CONTENT_ZOOM = 0.9;
export const MAX_CONTENT_ZOOM = 1.5;
export const CONTENT_ZOOM_STEP = 0.1;

export type WritingLLMResult = {
  scores: {
    task: number;
    grammar: number;
    vocabulary: number;
    coherence: number;
    overall: number;
  };
  corrections: { original: string; fixed: string; explanation: string }[];
  suggestions: string[];
  rewritten: string;
  model?: string;
};

export type WritingDraft = {
  profileId: string;
  lessonId: string;
  text: string;
  mcPicks: Record<string, number>;
  sampleRevealed: boolean;
  updatedAt: number;
  durationMs: number;
};

export type WritingAttempt = {
  id: string;
  profileId: string;
  lessonId: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  text: string;
  mcScore: number;
  mcTotal: number;
  mcPicks: Record<string, number>;
  llmResult: WritingLLMResult | null;
  sampleRevealed: boolean;
};

export type SpeakingRecording = {
  id: string;          // crypto.randomUUID()
  profileId: string;
  lessonId: string;
  role: string;        // character name the user played
  completedAt: number; // Unix ms
  durationMs: number;
  turnCount: number;
  mp3Blob: Blob;       // stored locally only, never uploaded
};

export type SpeakingSessionDraft = {
  profileId: string;
  lessonId: string;
  role: string;
  turnBlobs: Record<number, Blob>; // turnIndex → recorded Blob
  updatedAt: number;
};
