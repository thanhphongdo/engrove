"use client";

import { ArrowRight } from "lucide-react";
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
  "inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100";

/** `showProgress` adds a progress bar before the count + an arrow on Submit
 *  (used by Listening, matching its mockup). */
export function QuizFooter({ showProgress = false }: { showProgress?: boolean }) {
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
  const pct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

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

  const submitLabel = (
    <>
      Submit
      {showProgress && <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />}
    </>
  );

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {showProgress && (
          <div className="flex h-2 w-32 overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
        )}
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{answeredCount}</span> / {totalQuestions} answered
          {hasCloze && (
            <span className="ml-1 text-xs text-neutral-400 dark:text-neutral-500">
              (MC {Object.keys(mcPicks).length}/{lesson.questions.length} · Cloze {Object.keys(clozePicks).length}/{lesson.cloze!.blanks.length})
            </span>
          )}
        </span>
      </div>
      {unanswered > 0 ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" className={SUBMIT_BTN}>{submitLabel}</button>
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
        <button type="button" className={SUBMIT_BTN} onClick={submit}>{submitLabel}</button>
      )}
    </div>
  );
}
