import { describe, it, expect } from "vitest";
import { scoreCloze, scoreQuiz } from "./score";
import type { ClozeBlank, Question } from "./types";

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

const b = (id: string, answerIndex: 0 | 1 | 2 | 3): ClozeBlank => ({
  id,
  options: ["a", "b", "c", "d"],
  answerIndex,
  explanation: "",
});

describe("scoreCloze", () => {
  it("counts correct picks", () => {
    const blanks = [b("b1", 0), b("b2", 1), b("b3", 2)];
    const picks = { b1: 0, b2: 1, b3: 3 };
    const result = scoreCloze(blanks, picks);
    expect(result.score).toBe(2);
    expect(result.total).toBe(3);
  });

  it("missing picks are unanswered", () => {
    const blanks = [b("b1", 0), b("b2", 1)];
    const result = scoreCloze(blanks, { b1: 0 });
    expect(result.answers).toEqual([
      { questionId: "b1", pickedIndex: 0, correct: true },
      { questionId: "b2", pickedIndex: null, correct: false },
    ]);
  });
});
