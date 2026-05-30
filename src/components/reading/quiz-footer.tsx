"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuiz } from "./quiz-section";
import { ReviewSummary } from "./review-summary";

const SUBMIT_BTN =
  "rounded-lg bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100";

export function QuizFooter() {
  const {
    lesson,
    mcPicks,
    clozePicks,
    mcResult,
    clozeResult,
    finalDurationMs,
    reviewMode,
    answeredCount,
    totalQuestions,
    submit,
    retry,
  } = useQuiz();

  const hasCloze = Boolean(lesson.cloze);
  const unanswered = totalQuestions - answeredCount;

  if (reviewMode && mcResult) {
    return (
      <div className="mt-5 space-y-3">
        <ReviewSummary
          mcScore={mcResult.score}
          mcTotal={mcResult.total}
          clozeScore={clozeResult?.score ?? null}
          clozeTotal={clozeResult?.total ?? null}
          durationMs={finalDurationMs}
        />
        <button
          type="button"
          onClick={retry}
          className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-white/5"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <span className="text-sm text-neutral-500 dark:text-neutral-400">
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{answeredCount}</span> / {totalQuestions} answered
        {hasCloze && (
          <span className="ml-1 text-xs text-neutral-400 dark:text-neutral-500">
            (MC {Object.keys(mcPicks).length}/{lesson.questions.length} · Cloze {Object.keys(clozePicks).length}/{lesson.cloze!.blanks.length})
          </span>
        )}
      </span>
      {unanswered > 0 ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" className={SUBMIT_BTN}>Submit</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {unanswered} question{unanswered === 1 ? "" : "s"} unanswered
              </AlertDialogTitle>
              <AlertDialogDescription>Unanswered questions count as wrong. Submit anyway?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={submit}>Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <button type="button" className={SUBMIT_BTN} onClick={submit}>Submit</button>
      )}
    </div>
  );
}
