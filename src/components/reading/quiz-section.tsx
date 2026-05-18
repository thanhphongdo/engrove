"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { scoreCloze, scoreQuiz, type ScoreResult } from "@/lib/lessons/score";
import { saveAttempt, deleteDraft, upsertDraft } from "@/lib/db/queries";
import { useTimerStore } from "@/stores/timer-store";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import type { Lesson } from "@/lib/lessons/types";

type Picks = Record<string, number>;

type QuizContextValue = {
  lesson: Lesson;
  mcPicks: Picks;
  clozePicks: Picks;
  setMcPick: (id: string, index: number) => void;
  setClozePick: (id: string, index: number) => void;
  mcResult: ScoreResult | null;
  clozeResult: ScoreResult | null;
  finalDurationMs: number;
  reviewMode: boolean;
  /** Combined answered count across MC + cloze. */
  answeredCount: number;
  /** Combined total across MC + cloze. */
  totalQuestions: number;
  submit: () => Promise<void>;
  retry: () => void;
};

const QuizContext = createContext<QuizContextValue | null>(null);

export function useQuiz(): QuizContextValue {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used inside <QuizSection>");
  return ctx;
}

export function QuizSection({
  lesson,
  initialPicks,
  initialClozePicks,
  initialDurationMs = 0,
  onAttemptSaved,
  children,
}: {
  lesson: Lesson;
  initialPicks: Picks;
  initialClozePicks: Picks;
  initialDurationMs?: number;
  onAttemptSaved: () => void;
  children: ReactNode;
}) {
  const profileId = useActiveProfileId();
  const [mcPicks, setMcPicks] = useState<Picks>(initialPicks);
  const [clozePicks, setClozePicks] = useState<Picks>(initialClozePicks);
  const [mcResult, setMcResult] = useState<ScoreResult | null>(null);
  const [clozeResult, setClozeResult] = useState<ScoreResult | null>(null);
  const [finalDurationMs, setFinalDurationMs] = useState(0);

  const stopTimer = useTimerStore((s) => s.stop);
  const resetTimer = useTimerStore((s) => s.reset);
  const hydrate = useTimerStore((s) => s.hydrate);
  const running = useTimerStore((s) => s.running);

  const startedAtRef = useRef<number | null>(null);
  const ensureStartedAt = useCallback(() => {
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (initialDurationMs > 0) hydrate(initialDurationMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const reviewMode = mcResult !== null;

  // Debounced draft save on pick changes
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (reviewMode) return;
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      upsertDraft({
        profileId,
        lessonId: lesson.id,
        answers: mcPicks,
        clozePicks,
        durationMs: useTimerStore.getState().elapsedAt(Date.now()),
        updatedAt: Date.now(),
      }).catch(() => {});
    }, 1000);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [mcPicks, clozePicks, lesson.id, reviewMode, profileId]);

  // Immediate save when timer transitions to stopped
  useEffect(() => {
    if (reviewMode || running) return;
    upsertDraft({
      profileId,
      lessonId: lesson.id,
      answers: mcPicks,
      clozePicks,
      durationMs: useTimerStore.getState().elapsedAt(Date.now()),
      updatedAt: Date.now(),
    }).catch(() => {});
  }, [running, mcPicks, clozePicks, lesson.id, reviewMode, profileId]);

  const setMcPick = useCallback(
    (id: string, index: number) => {
      ensureStartedAt();
      setMcPicks((p) => ({ ...p, [id]: index }));
    },
    [ensureStartedAt],
  );

  const setClozePick = useCallback(
    (id: string, index: number) => {
      ensureStartedAt();
      setClozePicks((p) => ({ ...p, [id]: index }));
    },
    [ensureStartedAt],
  );

  const mcTotal = lesson.questions.length;
  const clozeTotal = lesson.cloze ? lesson.cloze.blanks.length : 0;
  const totalQuestions = mcTotal + clozeTotal;
  const answeredCount = useMemo(
    () => Object.keys(mcPicks).length + Object.keys(clozePicks).length,
    [mcPicks, clozePicks],
  );

  const submit = useCallback(async () => {
    ensureStartedAt();
    stopTimer();
    const durationMs = useTimerStore.getState().accumulatedMs;
    setFinalDurationMs(durationMs);

    const mc = scoreQuiz(lesson.questions, mcPicks);
    const cloze = lesson.cloze ? scoreCloze(lesson.cloze.blanks, clozePicks) : null;

    const score = mc.score + (cloze?.score ?? 0);
    const total = mc.total + (cloze?.total ?? 0);

    await saveAttempt({
      id: crypto.randomUUID(),
      profileId,
      lessonId: lesson.id,
      startedAt: startedAtRef.current ?? Date.now(),
      completedAt: Date.now(),
      durationMs,
      score,
      total,
      mcScore: mc.score,
      mcTotal: mc.total,
      clozeScore: cloze?.score ?? 0,
      clozeTotal: cloze?.total ?? 0,
      answers: mc.answers,
      clozeAnswers: cloze?.answers,
    });
    await deleteDraft(profileId, lesson.id);

    setMcResult(mc);
    setClozeResult(cloze);
    toast.success(`Saved. Score: ${score}/${total}`);
    onAttemptSaved();
  }, [
    ensureStartedAt,
    stopTimer,
    lesson.questions,
    lesson.cloze,
    lesson.id,
    mcPicks,
    clozePicks,
    profileId,
    onAttemptSaved,
  ]);

  const retry = useCallback(() => {
    setMcPicks({});
    setClozePicks({});
    setMcResult(null);
    setClozeResult(null);
    setFinalDurationMs(0);
    startedAtRef.current = null;
    resetTimer();
  }, [resetTimer]);

  const value: QuizContextValue = {
    lesson,
    mcPicks,
    clozePicks,
    setMcPick,
    setClozePick,
    mcResult,
    clozeResult,
    finalDurationMs,
    reviewMode,
    answeredCount,
    totalQuestions,
    submit,
    retry,
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}
