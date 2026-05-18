import type { ClozeBlank, Question } from "./types";

export type AnswerRow = {
  questionId: string;
  pickedIndex: number | null;
  correct: boolean;
};

export type ScoreResult = {
  score: number;
  total: number;
  answers: AnswerRow[];
};

export function scoreQuiz(
  questions: Question[],
  picks: Record<string, number>,
): ScoreResult {
  const answers: AnswerRow[] = questions.map((q) => {
    const pickedIndex = q.id in picks ? picks[q.id] : null;
    return {
      questionId: q.id,
      pickedIndex,
      correct: pickedIndex === q.answerIndex,
    };
  });
  return {
    score: answers.filter((a) => a.correct).length,
    total: questions.length,
    answers,
  };
}

/**
 * Mirrors scoreQuiz for cloze blanks. The shape returned is identical so the
 * QuizSection can combine MC + cloze results uniformly.
 */
export function scoreCloze(
  blanks: ClozeBlank[],
  picks: Record<string, number>,
): ScoreResult {
  const answers: AnswerRow[] = blanks.map((b) => {
    const pickedIndex = b.id in picks ? picks[b.id] : null;
    return {
      questionId: b.id,
      pickedIndex,
      correct: pickedIndex === b.answerIndex,
    };
  });
  return {
    score: answers.filter((a) => a.correct).length,
    total: blanks.length,
    answers,
  };
}
