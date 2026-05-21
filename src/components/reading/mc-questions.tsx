"use client";

import { QuizQuestion } from "./quiz-question";
import { useQuiz } from "./quiz-section";
import type { Question } from "@/lib/lessons/types";

type Props = {
  showHint: boolean;
  /** Optional override; falls back to QuizSection context if omitted. */
  questions?: Question[];
  picks?: Record<string, number>;
  onPick?: (id: string, index: number) => void;
  reviewMode?: boolean;
  /** Section label. Defaults to "Reading questions". */
  label?: string;
};

export function MCQuestions({
  showHint,
  questions,
  picks,
  onPick,
  reviewMode,
  label,
}: Props) {
  // When any explicit prop is provided, run in "controlled" mode without
  // reading the QuizSection context. This lets non-reading callers (writing)
  // use the same UI without providing a QuizSection.
  const controlled =
    questions !== undefined ||
    picks !== undefined ||
    onPick !== undefined ||
    reviewMode !== undefined;

  if (controlled) {
    if (!questions || !picks || !onPick) {
      throw new Error(
        "MCQuestions: when used in controlled mode, you must pass questions, picks, and onPick.",
      );
    }
    return (
      <div className="space-y-2 sm:space-y-3">
        <p className="text-sm font-semibold">
          {label ?? "Questions"} · {questions.length}
        </p>
        <div className="divide-y divide-border/60">
          {questions.map((q, i) => (
            <QuizQuestion
              key={q.id}
              index={i}
              question={q}
              value={picks[q.id]}
              onChange={(v) => onPick(q.id, v)}
              showHint={showHint}
              reviewMode={Boolean(reviewMode)}
            />
          ))}
        </div>
      </div>
    );
  }

  return <MCQuestionsFromContext showHint={showHint} label={label} />;
}

function MCQuestionsFromContext({
  showHint,
  label,
}: {
  showHint: boolean;
  label?: string;
}) {
  const { lesson, mcPicks, setMcPick, reviewMode } = useQuiz();
  return (
    <div className="space-y-2 sm:space-y-3">
      <p className="text-sm font-semibold">
        {label ?? "Reading questions"} · {lesson.questions.length}
      </p>
      <div className="divide-y divide-border/60">
        {lesson.questions.map((q, i) => (
          <QuizQuestion
            key={q.id}
            index={i}
            question={q}
            value={mcPicks[q.id]}
            onChange={(v) => setMcPick(q.id, v)}
            showHint={showHint}
            reviewMode={reviewMode}
          />
        ))}
      </div>
    </div>
  );
}
