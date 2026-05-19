"use client";

import { Button } from "@/components/ui/button";
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
      <div className="mt-4 space-y-3">
        <ReviewSummary
          mcScore={mcResult.score}
          mcTotal={mcResult.total}
          clozeScore={clozeResult?.score ?? null}
          clozeTotal={clozeResult?.total ?? null}
          durationMs={finalDurationMs}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={retry}
        >
          Retry
        </Button>
      </div>
    );
  }

  const counterLine = hasCloze
    ? `${answeredCount} / ${totalQuestions} answered ` +
      `(MC ${Object.keys(mcPicks).length}/${lesson.questions.length} · ` +
      `Cloze ${Object.keys(clozePicks).length}/${lesson.cloze!.blanks.length})`
    : `${answeredCount} / ${totalQuestions} answered`;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs text-muted-foreground">{counterLine}</p>
      <div className="flex justify-center">
        {unanswered > 0 ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" className="w-full sm:w-auto sm:min-w-80">
                Submit
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {unanswered} question{unanswered === 1 ? "" : "s"} unanswered
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Unanswered questions count as wrong. Submit anyway?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={submit}>Submit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            type="button"
            className="w-full sm:w-auto sm:min-w-80"
            onClick={submit}
          >
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}
