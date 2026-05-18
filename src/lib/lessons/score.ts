import type { Question } from "./types";

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
