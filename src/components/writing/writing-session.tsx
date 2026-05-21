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
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import {
  deleteWritingDraft,
  saveWritingAttempt,
  upsertWritingDraft,
} from "@/lib/db/queries";
import { scoreQuiz } from "@/lib/lessons/score";
import type { WritingLesson } from "@/lib/lessons/types";
import type { WritingDraft, WritingLLMResult } from "@/lib/db/types";

type Picks = Record<string, number>;
type Phase = "idle" | "waiting" | "ready";

type ContextValue = {
  lesson: WritingLesson;
  text: string;
  setText: (t: string) => void;
  mcPicks: Picks;
  setMcPick: (id: string, index: number) => void;
  sampleRevealed: boolean;
  revealSample: () => void;
  callbackUrl: string | null;
  sessionToken: string | null;
  phase: Phase;
  expired: boolean;
  llmResult: WritingLLMResult | null;
  /** Creates a session token and shows the prompt-copy panel. */
  startSession: () => Promise<void>;
  /** Cancels the current session and clears local state. */
  cancelSession: () => Promise<void>;
  /** Used by the paste-back flow to render the result without a relay round-trip. */
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
  const [sessionToken, setSessionToken] = useState<string | null>(
    initialDraft?.sessionToken ?? null,
  );
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(
    initialDraft?.sessionToken ? "waiting" : "idle",
  );
  const [expired, setExpired] = useState(false);
  const [llmResult, setLlmResult] = useState<WritingLLMResult | null>(null);
  const [startedAt] = useState<number>(() => Date.now());

  // Debounced draft save
  const draftSaveRef = useRef<number | null>(null);
  useEffect(() => {
    if (draftSaveRef.current !== null) window.clearTimeout(draftSaveRef.current);
    draftSaveRef.current = window.setTimeout(() => {
      upsertWritingDraft({
        profileId,
        lessonId: lesson.id,
        text,
        mcPicks,
        sessionToken,
        sampleRevealed,
        updatedAt: Date.now(),
        durationMs: Date.now() - startedAt,
      }).catch(() => {});
    }, 600);
    return () => {
      if (draftSaveRef.current !== null) window.clearTimeout(draftSaveRef.current);
    };
  }, [profileId, lesson.id, text, mcPicks, sessionToken, sampleRevealed]);

  // Firestore subscription when a token is set
  useEffect(() => {
    if (!sessionToken) return;
    const ref = doc(getDb(), "writingSessions", sessionToken);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        if (!data) {
          setExpired(true);
          return;
        }
        const exp = data.expiresAt?.toMillis?.() as number | undefined;
        if (data.status === "ready" && data.result) {
          const result = data.result as WritingLLMResult;
          setLlmResult(result);
          setPhase("ready");
          // Persist as a completed attempt
          const mcResult = scoreQuiz(lesson.mcQuestions, mcPicks);
          const id =
            globalThis.crypto?.randomUUID?.() ??
            `att-${Math.random().toString(36).slice(2)}`;
          saveWritingAttempt({
            id,
            profileId,
            lessonId: lesson.id,
            startedAt: startedAt,
            completedAt: Date.now(),
            durationMs: Date.now() - startedAt,
            text,
            mcScore: mcResult.score,
            mcTotal: mcResult.total,
            mcPicks,
            llmResult: result,
            sampleRevealed,
          })
            .then(() => deleteWritingDraft(profileId, lesson.id))
            .then(() => {
              toast.success("Feedback received");
            })
            .catch(() => {});
          // Clear the token so a future attempt starts a fresh session
          setSessionToken(null);
        } else if (exp != null && Date.now() > exp) {
          setExpired(true);
        }
      },
      () => {
        // ignore; the SDK will auto-reconnect
      },
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- text/mcPicks intentionally captured at save time
  }, [sessionToken, lesson.id, lesson.mcQuestions, profileId, sampleRevealed]);

  const setMcPick = useCallback((id: string, index: number) => {
    setMcPicks((p) => ({ ...p, [id]: index }));
  }, []);

  const revealSample = useCallback(() => {
    setSampleRevealed(true);
  }, []);

  const startSession = useCallback(async () => {
    setLlmResult(null);
    setExpired(false);
    setPhase("waiting");
    const res = await fetch("/api/writing/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: lesson.id, profileId }),
    });
    if (!res.ok) {
      setPhase("idle");
      toast.error("Couldn't start a feedback session — please retry.");
      return;
    }
    const data = (await res.json()) as { token: string; callbackUrl: string };
    setSessionToken(data.token);
    setCallbackUrl(data.callbackUrl);
  }, [lesson.id, profileId]);

  const cancelSession = useCallback(async () => {
    setSessionToken(null);
    setCallbackUrl(null);
    setPhase("idle");
    setExpired(false);
    setLlmResult(null);
  }, []);

  const applyResult = useCallback((result: WritingLLMResult) => {
    setLlmResult(result);
    setPhase("ready");
    setSessionToken(null);
    setCallbackUrl(null);
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      lesson,
      text,
      setText,
      mcPicks,
      setMcPick,
      sampleRevealed,
      revealSample,
      callbackUrl,
      sessionToken,
      phase,
      expired,
      llmResult,
      startSession,
      cancelSession,
      applyResult,
    }),
    [
      lesson,
      text,
      mcPicks,
      setMcPick,
      sampleRevealed,
      revealSample,
      callbackUrl,
      sessionToken,
      phase,
      expired,
      llmResult,
      startSession,
      cancelSession,
      applyResult,
    ],
  );

  return (
    <WritingSessionContext.Provider value={value}>
      {children}
    </WritingSessionContext.Provider>
  );
}
