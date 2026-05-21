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
  /** Creates a session token and shows the prompt-copy panel. Returns the callbackUrl on success, null on failure. */
  startSession: () => Promise<string | null>;
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

  // Poll the relay endpoint while a session token is set.
  //
  // Resilient to server redeploys: each poll is a stateless HTTP request, so
  // a redeploy mid-flight at worst causes one failed request — the next
  // interval retries against the new deploy. Session state lives in Vercel KV
  // (external), so a redeploy never loses a pending or ready session.
  //
  // Hard guards:
  //   - 404 from the server (KV TTL expired or session deleted) → expired
  //   - 5+ minutes of no resolution → soft expired, user can retry
  //   - network errors → swallowed, retried on next interval
  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;
    const POLL_INTERVAL_MS = 2000;
    const CLIENT_TIMEOUT_MS = 5 * 60 * 1000;
    const startedPollingAt = Date.now();

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/writing/result/${sessionToken}`, {
          cache: "no-store",
        });

        if (res.status === 404) {
          if (!cancelled) setExpired(true);
          return;
        }

        if (res.ok) {
          const data = (await res.json()) as {
            status: "pending" | "ready";
            result: WritingLLMResult | null;
            expiresAt?: number;
          };
          if (data.status === "ready" && data.result) {
            if (cancelled) return;
            const result = data.result;
            setLlmResult(result);
            setPhase("ready");
            const mcResult = scoreQuiz(lesson.mcQuestions, mcPicks);
            const id =
              globalThis.crypto?.randomUUID?.() ??
              `att-${Math.random().toString(36).slice(2)}`;
            saveWritingAttempt({
              id,
              profileId,
              lessonId: lesson.id,
              startedAt,
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
            setSessionToken(null);
            return;
          }
          if (data.expiresAt != null && Date.now() > data.expiresAt) {
            if (!cancelled) setExpired(true);
            return;
          }
        }
        // res !res.ok and not 404 (e.g. 5xx during a redeploy): fall through,
        // retry on the next interval.
      } catch {
        // Network blip — fall through to retry.
      }

      if (Date.now() - startedPollingAt > CLIENT_TIMEOUT_MS) {
        if (!cancelled) setExpired(true);
        return;
      }

      if (!cancelled) {
        window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
    // text / mcPicks are intentionally captured at the time the ready response
    // arrives — re-running the effect on every keystroke would reset polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, lesson.id, lesson.mcQuestions, profileId, sampleRevealed, startedAt]);

  const setMcPick = useCallback((id: string, index: number) => {
    setMcPicks((p) => ({ ...p, [id]: index }));
  }, []);

  const revealSample = useCallback(() => {
    setSampleRevealed(true);
  }, []);

  const startSession = useCallback(async (): Promise<string | null> => {
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
      return null;
    }
    const data = (await res.json()) as { token: string; callbackUrl: string };
    setSessionToken(data.token);
    setCallbackUrl(data.callbackUrl);
    return data.callbackUrl;
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
