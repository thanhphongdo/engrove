"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, RotateCcw, Settings } from "lucide-react";
import { useLocalStorageBoolean, useLocalStorageString } from "@/lib/use-local-storage";
import { TurnRow } from "./turn-row";
import { MixResultCard } from "./mix-result-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PracticeOptionsDialog, type RecordMode } from "./practice-options-dialog";
import { mixToMp3, type MixChunk } from "@/lib/audio/mixer";
import { createRecorder, type RecorderHandle } from "@/lib/audio/recorder";
import { useSaveSpeakingRecording } from "@/lib/db/use-speaking-recordings";
import { useSaveSpeakingSessionDraft, useDeleteSpeakingSessionDraft } from "@/lib/db/use-speaking-session-draft";
import { usePreferences } from "@/lib/db/use-preferences";
import type { SpeakingLesson, SpeakingSentence } from "@/lib/lessons/speaking-schema";

// localStorage keys (see also page.tsx, which reads PREFERRED_VOICE_SEX for the default role)
const SKIP_SETUP_KEY = "speaking:skipSetup";
export const PREFERRED_VOICE_SEX_KEY = "speaking:preferredVoiceSex";
// In auto mode, how long after the recorder stops before we move to the next turn.
const AUTO_ADVANCE_MS = 600;
// Height of the sticky header + actions bar — auto-scroll stops below this.
const STICKY_OFFSET = 150;

// ── Helpers ────────────────────────────────────────────────────────────────

function buildTurnSentences(lesson: SpeakingLesson): Map<number, SpeakingSentence[]> {
  const map = new Map<number, SpeakingSentence[]>();
  let si = 0;
  for (let bi = 0; bi < lesson.body.length; bi++) {
    const turn = lesson.body[bi];
    const group: SpeakingSentence[] = [];
    const acc: string[] = [];
    while (si < lesson.sentences.length && lesson.sentences[si].speaker === turn.speaker) {
      acc.push(lesson.sentences[si].text);
      group.push(lesson.sentences[si]);
      si++;
      if (acc.join(" ").trim() === turn.text.trim()) break;
    }
    map.set(bi, group);
  }
  return map;
}

function expectedMs(sentences: SpeakingSentence[]): number {
  return sentences.reduce((s, sent) => s + (sent.durationMs ?? 2000), 0);
}

async function playSequential(sentences: SpeakingSentence[], cdnBase: string): Promise<void> {
  for (const s of sentences) {
    await new Promise<void>((resolve) => {
      const fallback = () => setTimeout(resolve, s.durationMs ?? 2000);
      const audio = new Audio(`${cdnBase}/sentences/${s.id}.mp3`);
      audio.onended = () => resolve();
      audio.onerror = fallback;
      audio.play().catch(fallback);
    });
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = "idle" | "in_session" | "done" | "mixing" | "mixed";

type Props = {
  lesson: SpeakingLesson;
  role: string;
  onRoleChange: (role: string) => void;
  controlsContainer?: HTMLElement | null;
  /** Mobile sticky-bar slot for the full-width primary action (md:hidden bar). */
  mobileControlsContainer?: HTMLElement | null;
  /** Full-width slot below the two-column grid where the mix result card portals in. */
  resultContainer?: HTMLElement | null;
  onActiveChange?: (active: boolean) => void;
};

// ── Component ─────────────────────────────────────────────────────────────

export function PracticeSession({ lesson, role, onRoleChange, controlsContainer, mobileControlsContainer, resultContainer, onActiveChange }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [turnIndex, setTurnIndex] = useState(0);
  const [turnBlobs, setTurnBlobs] = useState<Map<number, Blob>>(new Map());
  const [mixedBlob, setMixedBlob] = useState<Blob | null>(null);
  const [mixedDurationMs, setMixedDurationMs] = useState(0);
  const [mixError, setMixError] = useState<string | null>(null);
  const [rmsLevel, setRmsLevel] = useState(0);
  const [recordingTurn, setRecordingTurn] = useState<number | null>(null);
  const [autoRecord, setAutoRecord] = useLocalStorageBoolean("speaking:autoRecord");
  const [skipSetup, setSkipSetup] = useLocalStorageBoolean(SKIP_SETUP_KEY);
  const [, setPreferredVoiceSex] = useLocalStorageString<"female" | "male">(PREFERRED_VOICE_SEX_KEY, "female");
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [hasPractisedBefore, setHasPractisedBefore] = useState(false);

  const recorderRef = useRef<RecorderHandle | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRoleRef = useRef(role);
  const micStreamRef = useRef<MediaStream | null>(null);
  const activeTurnRef = useRef<HTMLDivElement | null>(null);
  const prevScrollTurnRef = useRef<number | null>(null);

  const saveRecording = useSaveSpeakingRecording();
  const saveDraft = useSaveSpeakingSessionDraft();
  const deleteDraft = useDeleteSpeakingSessionDraft();

  const prefs = usePreferences();
  const showTranslation = prefs.hintToggles.passageTranslation;

  const turnSentences = useMemo(() => buildTurnSentences(lesson), [lesson]);
  const totalTurns = lesson.body.length;

  // Notify parent: hide the transcript only while actively recording/reviewing.
  // After "mixed" (and when idle) the transcript stays visible alongside the result.
  useEffect(() => {
    onActiveChange?.(phase === "in_session" || phase === "done" || phase === "mixing");
  }, [phase, onActiveChange]);

  // Keep the active turn in view as the session advances. The first turn of a
  // session is already visible (you just clicked Start at the top), so never
  // scroll for it — only on forward advances, and only when it's actually
  // off-screen. `scroll-margin-top/bottom` on the wrapper keeps it clear of the
  // sticky header (block:"nearest" does the minimal scroll).
  useEffect(() => {
    if (phase !== "in_session") { prevScrollTurnRef.current = null; return; }
    if (prevScrollTurnRef.current === null) { prevScrollTurnRef.current = turnIndex; return; }
    prevScrollTurnRef.current = turnIndex;
    const el = activeTurnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < STICKY_OFFSET || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [phase, turnIndex]);

  // Per-turn Vietnamese: concatenate sentence translationVi fields
  const turnTranslationsVi = useMemo(() => {
    const map = new Map<number, string>();
    for (let bi = 0; bi < lesson.body.length; bi++) {
      const sentences = turnSentences.get(bi) ?? [];
      const vi = sentences.map((s) => (s as { translationVi?: string }).translationVi ?? "").filter(Boolean).join(" ");
      if (vi) map.set(bi, vi);
    }
    return map;
  }, [lesson.body.length, turnSentences]);

  // Reloading or re-entering the page is a fresh start — discard any saved draft
  // instead of resuming the previous in-progress session.
  useEffect(() => {
    deleteDraft(lesson.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changing role from outside an idle state invalidates recordings — reset to a clean slate.
  useEffect(() => {
    if (prevRoleRef.current !== role) {
      prevRoleRef.current = role;
      if (phase !== "idle") resetSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Persist draft whenever turn blobs change
  useEffect(() => {
    if (turnBlobs.size === 0) return;
    saveDraft({
      lessonId: lesson.id,
      role,
      turnBlobs: Object.fromEntries(turnBlobs),
      updatedAt: Date.now(),
    });
  }, [turnBlobs, lesson.id, role, saveDraft]);

  // Auto-play system turns when they become active
  useEffect(() => {
    if (phase !== "in_session") return;
    const turn = lesson.body[turnIndex];
    if (turn.speaker === role) return; // user turn — don't auto-play

    const sentences = turnSentences.get(turnIndex) ?? [];
    playSequential(sentences, lesson.audio.cdnBase).then(() => {
      advanceTurn();
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turnIndex, role]);

  // Auto-record: start mic automatically when it's the user's turn (opt-in)
  useEffect(() => {
    if (phase !== "in_session" || !autoRecord) return;
    const turn = lesson.body[turnIndex];
    if (turn.speaker !== role) return;       // system turn
    if (turnBlobs.has(turnIndex)) return;    // already recorded
    if (recorderRef.current) return;         // already recording
    // Start the moment it's your turn — no perceptible delay.
    handleRecord(turnIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turnIndex, autoRecord, role]);

  // Open the mic once per session and reuse it for every turn — re-acquiring it
  // each turn cold-starts getUserMedia and clips the first words.
  async function ensureMic(): Promise<MediaStream | null> {
    if (micStreamRef.current) return micStreamRef.current;
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Mic access failed:", err);
      micStreamRef.current = null;
    }
    return micStreamRef.current;
  }

  function releaseMic() {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
  }

  // Release the shared mic stream when the component unmounts.
  useEffect(() => () => releaseMic(), []);

  // The mic is only needed while recording turns. Once the session leaves
  // "in_session" (done / mixing / mixed / idle), release it so the browser's
  // recording indicator turns off.
  useEffect(() => {
    if (phase !== "in_session") releaseMic();
  }, [phase]);

  function advanceTurn() {
    const next = turnIndex + 1;
    if (next >= totalTurns) setPhase("done");
    else setTurnIndex(next);
  }

  function resetSession() {
    recorderRef.current?.dispose();
    recorderRef.current = null;
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setTurnBlobs(new Map());
    setTurnIndex(0);
    setRecordingTurn(null);
    setMixedBlob(null);
    setMixError(null);
    releaseMic();
    deleteDraft(lesson.id);
  }

  /** Begin a fresh session with the given options (from setup dialog or a direct start). */
  async function beginSession(opts: { role: string; mode: RecordMode }) {
    resetSession();
    onRoleChange(opts.role);
    prevRoleRef.current = opts.role; // avoid the role-change effect wiping this fresh start
    setAutoRecord(opts.mode === "auto");
    const sex = lesson.voices[opts.role]?.sex;
    if (sex) setPreferredVoiceSex(sex);
    setHasPractisedBefore(true);
    await ensureMic(); // open the mic before the first turn so nothing is clipped
    setPhase("in_session");
  }

  /** "Start practice" button: skip setup if remembered, else open the dialog. */
  function handleStartClick() {
    if (skipSetup) void beginSession({ role, mode: autoRecord ? "auto" : "manual" });
    else setShowSetup(true);
  }

  function handleSetupStart(opts: { role: string; mode: RecordMode; remember: boolean }) {
    setSkipSetup(opts.remember);
    setShowSetup(false);
    void beginSession({ role: opts.role, mode: opts.mode });
  }

  function restartSession() {
    resetSession();
    setPhase("idle");
  }

  function handleRecord(bi: number) {
    const sentences = turnSentences.get(bi) ?? [];
    const dur = expectedMs(sentences);
    const recorder = createRecorder({ expectedDurationMs: dur, stream: micStreamRef.current ?? undefined });
    recorderRef.current = recorder;
    setRecordingTurn(bi); // flip the UI to "recording" immediately
    recorder.start().catch((err) => console.error("Recorder start failed:", err));
    // Poll RMS for visualizer
    const poll = setInterval(() => setRmsLevel(recorder.getRmsLevel()), 80);
    recorder.onStop = (blob) => {
      clearInterval(poll);
      setRmsLevel(0);
      setRecordingTurn(null);
      setTurnBlobs((prev) => new Map(prev).set(bi, blob));
      // Auto mode flows straight on; manual waits for the user to tap Continue.
      if (autoRecord) {
        autoAdvanceRef.current = setTimeout(() => handleContinue(bi), AUTO_ADVANCE_MS);
      }
    };
  }

  function handleStopRecording() {
    recorderRef.current?.stop();
  }

  function handlePlayback(bi: number) {
    const blob = turnBlobs.get(bi);
    if (!blob) return;
    new Audio(URL.createObjectURL(blob)).play().catch(console.error);
  }

  function handleContinue(bi: number) {
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    recorderRef.current?.dispose();
    recorderRef.current = null;
    setRecordingTurn(null);
    const next = bi + 1;
    if (next >= totalTurns) setPhase("done");
    else setTurnIndex(next);
  }

  function handlePlayModel(bi: number) {
    const sentences = turnSentences.get(bi) ?? [];
    playSequential(sentences, lesson.audio.cdnBase).catch(console.error);
  }

  async function handleMix() {
    // Stop any in-flight recording first so we mix a clean state.
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    recorderRef.current?.dispose();
    recorderRef.current = null;
    setRecordingTurn(null);

    const resumePhase: Phase = phase === "done" ? "done" : "in_session";
    setPhase("mixing");
    setMixError(null);
    try {
      const chunks: MixChunk[] = [];
      let mixedTurns = 0;
      let userTurns = 0;
      // Mix the recorded prefix: walk turns until the first un-recorded user turn.
      // System turns (and the clerk's reply after your last line) are included.
      for (let bi = 0; bi < totalTurns; bi++) {
        const sentences = turnSentences.get(bi) ?? [];
        if (lesson.body[bi].speaker === role) {
          const blob = turnBlobs.get(bi);
          if (!blob) break;
          chunks.push({ kind: "user", blob });
          userTurns++;
        } else {
          for (const s of sentences) {
            const res = await fetch(`${lesson.audio.cdnBase}/sentences/${s.id}.mp3`);
            chunks.push({ kind: "system", blob: await res.blob() });
          }
        }
        mixedTurns = bi + 1;
      }
      if (userTurns === 0) {
        setMixError("Record at least one turn before saving.");
        setPhase(resumePhase);
        return;
      }
      const mp3 = await mixToMp3(chunks);
      // WAV: 44-byte header + 16-bit mono @ 44100 Hz → 88200 bytes/s
      const durMs = Math.round((mp3.size - 44) / 88200 * 1000);
      await saveRecording({
        lessonId: lesson.id,
        role,
        completedAt: Date.now(),
        durationMs: durMs,
        turnCount: mixedTurns,
        mp3Blob: mp3,
      });
      await deleteDraft(lesson.id);
      setMixedBlob(mp3);
      setMixedDurationMs(durMs);
      setPhase("mixed");
    } catch (err) {
      console.error("Mix failed:", err);
      setMixError(err instanceof Error ? err.message : "Mix failed");
      setPhase(resumePhase);
    }
  }

  function getTurnState(bi: number) {
    if (phase === "idle") return "upcoming";
    if (phase === "done" || phase === "mixing" || phase === "mixed") return "done";
    if (bi < turnIndex) return "done";
    if (bi > turnIndex) return "upcoming";
    // bi === turnIndex
    const isUser = lesson.body[bi].speaker === role;
    if (!isUser) return "system-playing";
    if (recordingTurn === bi) return "user-recording"; // flips instantly, no rms wait
    if (turnBlobs.has(bi)) return "user-recorded";
    return "user-idle";
  }

  // ── Controls (portaled into sticky bar) ──────────────────────────────

  const optionsBtn = (
    <button
      type="button"
      onClick={() => setShowSetup(true)}
      aria-label="Options"
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300"
    >
      <Settings className="size-4" aria-hidden="true" />
    </button>
  );

  // Header toolbar controls (portaled), shown on every breakpoint — the primary
  // practice action lives in the header (like the listening lesson), not a
  // bottom bar. The in-session status / Restart / Mix & Save stay inline on the
  // practice card.
  const controls = (
    <>
      {(phase === "idle" || phase === "in_session" || phase === "done") && optionsBtn}
      {phase === "idle" && (
        <button
          type="button"
          onClick={handleStartClick}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
        >
          <Mic className="size-3.5" aria-hidden="true" /> Start practice
        </button>
      )}
      {phase === "mixing" && (
        <span className="text-xs text-neutral-500 animate-pulse">Mixing…</span>
      )}
      {phase === "mixed" && (
        <button
          type="button"
          onClick={restartSession}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" /> Practice again
        </button>
      )}
    </>
  );

  // Mobile sticky-bar primary action (full-width). Same actions as the header
  // control, mirrored at the bottom of the screen for thumb reach on mobile.
  const mobileBtnPrimary =
    "flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900";
  const mobileBtnSecondary =
    "flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200";
  const mobileControls = (
    <>
      {phase === "idle" && (
        <button type="button" onClick={handleStartClick} className={mobileBtnPrimary}>
          <Mic className="size-4" aria-hidden="true" /> Start practice
        </button>
      )}
      {(phase === "in_session" || phase === "done") &&
        (turnBlobs.size > 0 ? (
          <button type="button" onClick={handleMix} className={mobileBtnPrimary}>
            Mix &amp; Save
          </button>
        ) : (
          <button type="button" onClick={() => setShowRestartConfirm(true)} className={mobileBtnSecondary}>
            <RotateCcw className="size-4" aria-hidden="true" /> Restart
          </button>
        ))}
      {phase === "mixing" && (
        <span className="flex flex-1 items-center justify-center text-sm text-neutral-500 animate-pulse">
          Mixing…
        </span>
      )}
      {phase === "mixed" && (
        <button type="button" onClick={restartSession} className={mobileBtnPrimary}>
          <RotateCcw className="size-4" aria-hidden="true" /> Practice again
        </button>
      )}
    </>
  );

  // Inline session bar — only while actively practising / reviewing before mix.
  const sessionBar = (phase === "in_session" || phase === "done") && (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-neutral-100 pt-3 dark:border-white/10">
      <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
        <span className="sm:hidden">
          {phase === "done" ? `${totalTurns}/${totalTurns}` : `Turn ${turnIndex + 1}/${totalTurns}`}
        </span>
        <span className="hidden sm:inline">
          {phase === "done"
            ? `All ${totalTurns} turns recorded · as ${role}`
            : `Practicing · Turn ${turnIndex + 1} of ${totalTurns}`}
        </span>
      </span>
      <div className="flex shrink-0 items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setShowRestartConfirm(true)}
          className="inline-flex items-center gap-1 whitespace-nowrap text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" /> Restart
        </button>
        {turnBlobs.size > 0 && (
          <button
            type="button"
            onClick={handleMix}
            className="whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
          >
            Mix &amp; Save
          </button>
        )}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {controlsContainer && createPortal(controls, controlsContainer)}
      {mobileControlsContainer && createPortal(mobileControls, mobileControlsContainer)}

      <PracticeOptionsDialog
        open={showSetup}
        onOpenChange={setShowSetup}
        characters={lesson.characters}
        voices={lesson.voices}
        initialRole={role}
        initialMode={autoRecord ? "auto" : "manual"}
        initialRemember={skipSetup}
        hadPrevious={hasPractisedBefore}
        onStart={handleSetupStart}
      />

      <ConfirmDialog
        open={showRestartConfirm}
        onOpenChange={setShowRestartConfirm}
        title="Restart practice?"
        description="This will clear all your recorded turns and start over."
        confirmLabel="Restart"
        onConfirm={restartSession}
      />

      {/* Inline session bar (only while practising / reviewing before mix). */}
      {sessionBar}

      {/* Turn list — only while practising or reviewing before mixing */}
      {(phase === "in_session" || phase === "done") && (
        <div className="mt-4 space-y-5">
          {lesson.body.map((turn, bi) => (
            <div
              key={bi}
              ref={bi === turnIndex ? activeTurnRef : undefined}
              style={{ scrollMarginTop: STICKY_OFFSET, scrollMarginBottom: 24 }}
            >
              <TurnRow
                turnIndex={bi}
                speaker={turn.speaker}
                text={turn.text}
                translationVi={showTranslation ? turnTranslationsVi.get(bi) : undefined}
                isUser={turn.speaker === role}
                state={getTurnState(bi)}
                onRecord={() => handleRecord(bi)}
                onStopRecording={handleStopRecording}
                onPlayback={() => handlePlayback(bi)}
                onContinue={() => handleContinue(bi)}
                onPlayModel={() => handlePlayModel(bi)}
                getRmsLevel={() => rmsLevel}
                hasBlob={turnBlobs.has(bi)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Mix error */}
      {mixError && <p className="mt-3 text-sm text-destructive">{mixError}</p>}

      {/* Mixing */}
      {phase === "mixing" && (
        <p className="mt-4 text-center text-sm text-neutral-500 animate-pulse">Mixing your recording…</p>
      )}

      {/* Mixed: full-width result card portals below the two-column grid. */}
      {phase === "mixed" && mixedBlob && resultContainer &&
        createPortal(
          <MixResultCard
            mp3Blob={mixedBlob}
            durationMs={mixedDurationMs}
            lessonTitle={lesson.title}
            criticalThinkingQuestion={lesson.criticalThinkingQuestion}
          />,
          resultContainer,
        )}
    </>
  );
}
