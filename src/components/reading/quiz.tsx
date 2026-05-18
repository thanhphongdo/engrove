"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { saveAttempt, deleteDraft, upsertDraft } from "@/lib/db/queries";
import { useTimerStore } from "@/stores/timer-store";
import { QuizQuestion } from "./quiz-question";
import { ReviewSummary } from "./review-summary";
import type { Lesson } from "@/lib/lessons/types";

type Picks = Record<string, number>;

export function Quiz({
  lesson,
  showHint,
  initialPicks,
  initialDurationMs = 0,
  onAttemptSaved,
}: {
  lesson: Lesson;
  showHint: boolean;
  initialPicks: Picks;
  initialDurationMs?: number;
  onAttemptSaved: () => void;
}) {
  const [picks, setPicks] = useState<Picks>(initialPicks);
  const [result, setResult] = useState<ReturnType<typeof scoreQuiz> | null>(null);
  const [finalDurationMs, setFinalDurationMs] = useState(0);
  const stopTimer = useTimerStore((s) => s.stop);
  const resetTimer = useTimerStore((s) => s.reset);
  const hydrate = useTimerStore((s) => s.hydrate);
  // startedAt is captured once on mount; null until the effect fires.
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    // Hydrate timer from draft duration on mount (safe — sets external store, not React state).
    if (initialDurationMs > 0) {
      hydrate(initialDurationMs);
    }
    startedAtRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once on mount
  }, []);

  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (result) return; // don't save after submit
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      upsertDraft({
        profileId: "default",
        lessonId: lesson.id,
        answers: picks,
        durationMs: useTimerStore.getState().accumulatedMs,
        updatedAt: Date.now(),
      }).catch(() => {});
    }, 1000);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [picks, lesson.id, result]);

  const running = useTimerStore((s) => s.running);
  useEffect(() => {
    if (result || running) return; // only when timer transitions to stopped
    upsertDraft({
      profileId: "default",
      lessonId: lesson.id,
      answers: picks,
      durationMs: useTimerStore.getState().accumulatedMs,
      updatedAt: Date.now(),
    }).catch(() => {});
  }, [running, picks, lesson.id, result]);

  const answeredCount = useMemo(() => Object.keys(picks).length, [picks]);
  const total = lesson.questions.length;
  const unanswered = total - answeredCount;

  async function doSubmit() {
    stopTimer();
    const durationMs = useTimerStore.getState().accumulatedMs;
    setFinalDurationMs(durationMs);
    const r = scoreQuiz(lesson.questions, picks);
    const attempt = {
      id: crypto.randomUUID(),
      profileId: "default",
      lessonId: lesson.id,
      startedAt: startedAtRef.current ?? Date.now(),
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
    setFinalDurationMs(0);
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
          <ReviewSummary score={result.score} total={result.total} durationMs={finalDurationMs} />
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
