"use client";

import { useMemo, useRef, useState } from "react";
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
import { toast } from "sonner";
import { scoreQuiz } from "@/lib/lessons/score";
import { saveAttempt, deleteDraft } from "@/lib/db/queries";
import { useTimerStore } from "@/stores/timer-store";
import { QuizQuestion } from "./quiz-question";
import { ReviewSummary } from "./review-summary";
import type { Lesson } from "@/lib/lessons/types";

type Picks = Record<string, number>;

export function Quiz({
  lesson,
  showHint,
  initialPicks,
  onAttemptSaved,
}: {
  lesson: Lesson;
  showHint: boolean;
  initialPicks: Picks;
  onAttemptSaved: () => void;
}) {
  const [picks, setPicks] = useState<Picks>(initialPicks);
  const [result, setResult] = useState<ReturnType<typeof scoreQuiz> | null>(null);
  const stopTimer = useTimerStore((s) => s.stop);
  const resetTimer = useTimerStore((s) => s.reset);
  const startedAtRef = useRef(Date.now());

  const answeredCount = useMemo(() => Object.keys(picks).length, [picks]);
  const total = lesson.questions.length;
  const unanswered = total - answeredCount;

  async function doSubmit() {
    stopTimer();
    const durationMs = useTimerStore.getState().accumulatedMs;
    const r = scoreQuiz(lesson.questions, picks);
    const attempt = {
      id: crypto.randomUUID(),
      profileId: "default",
      lessonId: lesson.id,
      startedAt: startedAtRef.current,
      completedAt: Date.now(),
      durationMs,
      score: r.score,
      total: r.total,
      answers: r.answers,
    };
    await saveAttempt(attempt);
    await deleteDraft("default", lesson.id);
    setResult(r);
    toast.success(`Saved. Score: ${r.score}/${r.total}`);
    onAttemptSaved();
  }

  function retry() {
    setPicks({});
    setResult(null);
    resetTimer();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Quiz · {total} questions</p>
        {!result && <p className="text-xs text-muted-foreground">{answeredCount}/{total} answered</p>}
      </div>

      <div className="space-y-2">
        {lesson.questions.map((q, i) => (
          <QuizQuestion
            key={q.id}
            index={i}
            question={q}
            value={picks[q.id]}
            onChange={(v) => setPicks((p) => ({ ...p, [q.id]: v }))}
            showHint={showHint}
            reviewMode={result !== null}
          />
        ))}
      </div>

      {result ? (
        <>
          <ReviewSummary score={result.score} total={result.total} durationMs={useTimerStore.getState().accumulatedMs} />
          <Button type="button" variant="outline" className="w-full" onClick={retry}>
            Retry
          </Button>
        </>
      ) : unanswered > 0 ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" className="w-full">Submit quiz</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{unanswered} question{unanswered === 1 ? "" : "s"} unanswered</AlertDialogTitle>
              <AlertDialogDescription>
                Unanswered questions count as wrong. Submit anyway?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={doSubmit}>Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button type="button" className="w-full" onClick={doSubmit}>
          Submit quiz
        </Button>
      )}
    </div>
  );
}
