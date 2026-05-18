import { describe, it, expect } from "vitest";
import { scoreQuiz } from "./score";
import type { Question } from "./types";

const q = (id: string, answerIndex: 0 | 1 | 2 | 3): Question => ({
  id,
  prompt: id,
  options: ["a", "b", "c", "d"],
  answerIndex,
  explanation: "",
  hint: "",
});

describe("scoreQuiz", () => {
  it("counts correct answers", () => {
    const questions = [q("q1", 0), q("q2", 1), q("q3", 2)];
    const picks = { q1: 0, q2: 1, q3: 0 };
    const result = scoreQuiz(questions, picks);
    expect(result.score).toBe(2);
    expect(result.total).toBe(3);
  });

  it("treats missing picks as unanswered (incorrect)", () => {
    const questions = [q("q1", 0), q("q2", 1)];
    const picks = { q1: 0 };
    const result = scoreQuiz(questions, picks);
    expect(result.score).toBe(1);
    expect(result.answers).toEqual([
      { questionId: "q1", pickedIndex: 0, correct: true },
      { questionId: "q2", pickedIndex: null, correct: false },
    ]);
  });

  it("returns an answers array in question order", () => {
    const questions = [q("q1", 0), q("q2", 1)];
    const picks = { q2: 1, q1: 0 };
    const result = scoreQuiz(questions, picks);
    expect(result.answers.map((a) => a.questionId)).toEqual(["q1", "q2"]);
  });
});
