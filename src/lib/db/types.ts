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
};

export type Attempt = {
  id: string;
  profileId: string;
  lessonId: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  score: number;
  total: number;
  answers: AnswerRow[];
};

export type Draft = {
  profileId: string;
  lessonId: string;
  answers: Record<string, number>;
  durationMs: number;
  updatedAt: number;
};

export const DEFAULT_HINT_TOGGLES: HintToggles = {
  vocabVi: false,
  grammar: false,
  passageTranslation: false,
  perQuestionHint: false,
};
