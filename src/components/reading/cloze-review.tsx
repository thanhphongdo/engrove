"use client";

import { Check, X } from "lucide-react";
import { useQuiz } from "./quiz-section";

export function ClozeReview() {
  const { lesson, clozePicks, reviewMode } = useQuiz();
  if (!reviewMode || !lesson.cloze) return null;

  return (
    <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3 text-xs">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Cloze answers
      </p>
      <ol className="space-y-1.5">
        {lesson.cloze.blanks.map((b, i) => {
          const pickedIndex = clozePicks[b.id];
          const correct = pickedIndex === b.answerIndex;
          return (
            <li key={b.id} className="flex items-start gap-2">
              <span className="mt-0.5 text-muted-foreground">{i + 1}.</span>
              {correct ? (
                <Check className="mt-0.5 size-3.5 shrink-0 text-green-600" aria-hidden="true" />
              ) : (
                <X className="mt-0.5 size-3.5 shrink-0 text-red-600" aria-hidden="true" />
              )}
              <div className="flex-1">
                <p>
                  <span className="font-medium">{b.options[b.answerIndex]}</span>
                  {pickedIndex !== undefined && !correct && (
                    <span className="text-muted-foreground">
                      {" "}
                      (you picked &quot;{b.options[pickedIndex]}&quot;)
                    </span>
                  )}
                  {pickedIndex === undefined && (
                    <span className="text-muted-foreground"> (not answered)</span>
                  )}
                </p>
                {b.explanation && (
                  <p className="text-muted-foreground">{b.explanation}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
