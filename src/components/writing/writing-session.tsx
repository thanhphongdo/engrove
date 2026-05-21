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
import { Play } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import { upsertWritingDraft } from "@/lib/db/queries";
import { scoreQuiz, type ScoreResult } from "@/lib/lessons/score";
import { useTimerStore } from "@/stores/timer-store";
import type { WritingLesson } from "@/lib/lessons/types";
import type { WritingDraft, WritingLLMResult } from "@/lib/db/types";

type Picks = Record<string, number>;
type Phase = "idle" | "ready";

type ContextValue = {
  lesson: WritingLesson;
  text: string;
  setText: (t: string) => void;
  mcPicks: Picks;
  setMcPick: (id: string, index: number) => void;
  sampleRevealed: boolean;
  revealSample: () => void;
  /** MC quiz scoring + review state — matches the reading lesson pattern. */
  mcResult: ScoreResult | null;
  reviewMode: boolean;
  submitMc: () => void;
  retryMc: () => void;
  /** LLM (AI feedback) state. */
  phase: Phase;
  llmResult: WritingLLMResult | null;
  /** Called by paste-back / direct-API flows to render an LLM result. */
  applyResult: (result: WritingLLMResult) => void;
};

const WritingSessionContext = createContext<ContextValue | null>(null);

export function useWritingSession(): ContextValue {
  const ctx = useContext(WritingSessionContext);
  if (!ctx)
    throw new Error("useWritingSession must be used inside <WritingSessionProvider>");
  return ctx;
}

export function WritingSessionProvider({
  lesson,
  initialDraft,
  children,
}: {
  lesson: WritingLesson;
  initialDraft: WritingDraft | undefined;
  children: ReactNode;
}) {
  const profileId = useActiveProfileId();
  const [text, setText] = useState<string>(initialDraft?.text ?? "");
  const [mcPicks, setMcPicks] = useState<Picks>(initialDraft?.mcPicks ?? {});
  const [sampleRevealed, setSampleRevealed] = useState<boolean>(
    initialDraft?.sampleRevealed ?? false,
  );
  const [mcResult, setMcResult] = useState<ScoreResult | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [llmResult, setLlmResult] = useState<WritingLLMResult | null>(null);
  const [startPromptOpen, setStartPromptOpen] = useState(false);

  const status = useTimerStore((s) => s.status);
  const hydrate = useTimerStore((s) => s.hydrate);
  const beginTimer = useTimerStore((s) => s.begin);
  const resumeTimer = useTimerStore((s) => s.resume);
  const finishTimer = useTimerStore((s) => s.finish);
  const resetTimer = useTimerStore((s) => s.reset);
  const prevStatusRef = useRef(status);

  // Restore timer from saved draft duration on mount
  useEffect(() => {
    if ((initialDraft?.durationMs ?? 0) > 0) hydrate(initialDraft!.durationMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Debounced draft save — duration comes from the live timer
  const draftSaveRef = useRef<number | null>(null);
  useEffect(() => {
    if (draftSaveRef.current !== null) window.clearTimeout(draftSaveRef.current);
    draftSaveRef.current = window.setTimeout(() => {
      upsertWritingDraft({
        profileId,
        lessonId: lesson.id,
        text,
        mcPicks,
        sampleRevealed,
        updatedAt: Date.now(),
        durationMs: useTimerStore.getState().elapsedAt(Date.now()),
      }).catch(() => {});
    }, 600);
    return () => {
      if (draftSaveRef.current !== null) window.clearTimeout(draftSaveRef.current);
    };
  }, [profileId, lesson.id, text, mcPicks, sampleRevealed]);

  // Fresh attempt (stopped → running via begin()) wipes MC state
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prev !== "stopped" || status !== "running") return;
    setMcPicks({});
    setMcResult(null);
  }, [status]);

  const setMcPick = useCallback(
    (id: string, index: number) => {
      if (status !== "running") {
        setStartPromptOpen(true);
        return;
      }
      if (mcResult !== null) return;
      setMcPicks((p) => ({ ...p, [id]: index }));
    },
    [status, mcResult],
  );

  const revealSample = useCallback(() => {
    setSampleRevealed(true);
  }, []);

  const submitMc = useCallback(() => {
    if (mcResult !== null) return;
    finishTimer();
    setMcResult(scoreQuiz(lesson.mcQuestions, mcPicks));
  }, [mcResult, lesson.mcQuestions, mcPicks, finishTimer]);

  const retryMc = useCallback(() => {
    setMcPicks({});
    setMcResult(null);
    resetTimer();
  }, [resetTimer]);

  const handleStartFromPrompt = useCallback(() => {
    if (status === "paused") resumeTimer();
    else beginTimer();
    setStartPromptOpen(false);
  }, [status, beginTimer, resumeTimer]);

  const applyResult = useCallback((result: WritingLLMResult) => {
    setLlmResult(result);
    setPhase("ready");
  }, []);

  const reviewMode = mcResult !== null;

  const value = useMemo<ContextValue>(
    () => ({
      lesson,
      text,
      setText,
      mcPicks,
      setMcPick,
      sampleRevealed,
      revealSample,
      mcResult,
      reviewMode,
      submitMc,
      retryMc,
      phase,
      llmResult,
      applyResult,
    }),
    [
      lesson,
      text,
      mcPicks,
      setMcPick,
      sampleRevealed,
      revealSample,
      mcResult,
      reviewMode,
      submitMc,
      retryMc,
      phase,
      llmResult,
      applyResult,
    ],
  );

  return (
    <WritingSessionContext.Provider value={value}>
      {children}
      <AlertDialog open={startPromptOpen} onOpenChange={setStartPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {status === "paused"
                ? "Resume the timer to continue"
                : "Start the timer to begin"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {status === "paused"
                ? "Your attempt is paused. Press Resume to continue answering."
                : "Press Begin to start answering questions. The timer will start counting."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartFromPrompt}>
              <Play className="mr-1 size-3.5" aria-hidden="true" />
              {status === "paused" ? "Resume" : "Begin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WritingSessionContext.Provider>
  );
}
