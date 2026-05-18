"use client";

import { QuizQuestion } from "./quiz-question";
import { useQuiz } from "./quiz-section";

export function MCQuestions({ showHint }: { showHint: boolean }) {
  const { lesson, mcPicks, setMcPick, reviewMode } = useQuiz();
  return (
    <div className="space-y-2 sm:space-y-3">
      <p className="text-sm font-semibold">
        Reading questions · {lesson.questions.length}
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
