"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { TurnRow } from "./turn-row";
import { MixResultCard } from "./mix-result-card";
import { mixToMp3, type MixChunk } from "@/lib/audio/mixer";
import { createRecorder, type RecorderHandle } from "@/lib/audio/recorder";
import { useSaveSpeakingRecording } from "@/lib/db/use-speaking-recordings";
import { useSaveSpeakingSessionDraft, useDeleteSpeakingSessionDraft, useSpeakingSessionDraft } from "@/lib/db/use-speaking-session-draft";
import type { SpeakingLesson, SpeakingSentence } from "@/lib/lessons/speaking-schema";

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
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(`${cdnBase}/sentences/${s.id}.mp3`);
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error(`Failed to play ${s.id}`));
      audio.play().catch(reject);
    });
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = "idle" | "in_session" | "done" | "mixing" | "mixed";

type Props = { lesson: SpeakingLesson; role: string };

// ── Component ─────────────────────────────────────────────────────────────

export function PracticeSession({ lesson, role }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [turnIndex, setTurnIndex] = useState(0);
  const [turnBlobs, setTurnBlobs] = useState<Map<number, Blob>>(new Map());
  const [mixedBlob, setMixedBlob] = useState<Blob | null>(null);
  const [mixedDurationMs, setMixedDurationMs] = useState(0);
  const [mixError, setMixError] = useState<string | null>(null);
  const [rmsLevel, setRmsLevel] = useState(0);

  const recorderRef = useRef<RecorderHandle | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveRecording = useSaveSpeakingRecording();
  const saveDraft = useSaveSpeakingSessionDraft();
  const deleteDraft = useDeleteSpeakingSessionDraft();
  const draft = useSpeakingSessionDraft(lesson.id);

  const turnSentences = useMemo(() => buildTurnSentences(lesson), [lesson]);
  const totalTurns = lesson.body.length;

  // Restore from draft on mount
  useEffect(() => {
    if (draft && phase === "idle") {
      const restored = new Map(
        Object.entries(draft.turnBlobs).map(([k, v]) => [Number(k), v]),
      );
      setTurnBlobs(restored);
      const nextTurn = [...restored.keys()].reduce((max, k) => Math.max(max, k), -1) + 1;
      if (nextTurn >= totalTurns) {
        setTurnIndex(totalTurns - 1);
        setPhase("done");
      } else {
        setTurnIndex(nextTurn);
        setPhase("in_session");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

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

  function advanceTurn() {
    const next = turnIndex + 1;
    if (next >= totalTurns) {
      setPhase("done");
    } else {
      setTurnIndex(next);
    }
  }

  function startSession() {
    setTurnIndex(0);
    setPhase("in_session");
  }

  function restartSession() {
    if (!confirm("Clear all recorded turns and restart?")) return;
    recorderRef.current?.dispose();
    recorderRef.current = null;
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setTurnBlobs(new Map());
    setPhase("idle");
    setTurnIndex(0);
    setMixedBlob(null);
    deleteDraft(lesson.id);
  }

  function handleRecord(bi: number) {
    const sentences = turnSentences.get(bi) ?? [];
    const dur = expectedMs(sentences);
    const recorder = createRecorder({ expectedDurationMs: dur });
    recorderRef.current = recorder;
    recorder.start().catch((err) => console.error("Recorder start failed:", err));
    // Poll RMS for visualizer
    const poll = setInterval(() => setRmsLevel(recorder.getRmsLevel()), 80);
    recorder.onStop = (blob) => {
      clearInterval(poll);
      setRmsLevel(0);
      setTurnBlobs((prev) => new Map(prev).set(bi, blob));
      autoAdvanceRef.current = setTimeout(() => handleContinue(bi), 2000);
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
    const next = bi + 1;
    if (next >= totalTurns) setPhase("done");
    else setTurnIndex(next);
  }

  function handlePlayModel(bi: number) {
    const sentences = turnSentences.get(bi) ?? [];
    playSequential(sentences, lesson.audio.cdnBase).catch(console.error);
  }

  async function handleMix() {
    setPhase("mixing");
    setMixError(null);
    try {
      const chunks: MixChunk[] = [];
      for (let bi = 0; bi < totalTurns; bi++) {
        const sentences = turnSentences.get(bi) ?? [];
        if (lesson.body[bi].speaker === role) {
          const blob = turnBlobs.get(bi);
          if (blob) chunks.push({ kind: "user", blob });
        } else {
          for (const s of sentences) {
            const res = await fetch(`${lesson.audio.cdnBase}/sentences/${s.id}.mp3`);
            chunks.push({ kind: "system", blob: await res.blob() });
          }
        }
      }
      const mp3 = await mixToMp3(chunks);
      const durMs = Math.round(mp3.size / (128 * 1000 / 8) * 1000);
      await saveRecording({
        lessonId: lesson.id,
        role,
        completedAt: Date.now(),
        durationMs: durMs,
        turnCount: totalTurns,
        mp3Blob: mp3,
      });
      await deleteDraft(lesson.id);
      setMixedBlob(mp3);
      setMixedDurationMs(durMs);
      setPhase("mixed");
    } catch (err) {
      console.error("Mix failed:", err);
      setMixError(err instanceof Error ? err.message : "Mix failed");
      setPhase("done");
    }
  }

  function getTurnState(bi: number) {
    if (phase === "idle") return "upcoming";
    if (phase === "done" || phase === "mixing" || phase === "mixed") {
      return "done";
    }
    if (bi < turnIndex) return "done";
    if (bi > turnIndex) return "upcoming";
    // bi === turnIndex
    const isUser = lesson.body[bi].speaker === role;
    if (!isUser) return "system-playing";
    if (recorderRef.current && rmsLevel > 0) return "user-recording";
    if (turnBlobs.has(bi)) return "user-recorded";
    return "user-idle";
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Restart button (shown during session) */}
      {(phase === "in_session" || phase === "done") && (
        <div className="flex justify-end">
          <button type="button" onClick={restartSession}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
            <RotateCcw className="size-3" aria-hidden="true" />
            Restart session
          </button>
        </div>
      )}

      {/* Idle: show start button */}
      {phase === "idle" && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            You'll play <strong>{role}</strong>. Complete all {totalTurns} turns to create your recording.
          </p>
          <button type="button" onClick={startSession}
            className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Start practice
          </button>
        </div>
      )}

      {/* Turn list */}
      {phase !== "idle" && (
        <div className="space-y-3">
          {lesson.body.map((turn, bi) => (
            <TurnRow
              key={bi}
              turnIndex={bi}
              speaker={turn.speaker}
              text={turn.text}
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
          ))}
        </div>
      )}

      {/* Done: Mix & Save */}
      {phase === "done" && (
        <div className="text-center pt-2">
          {mixError && <p className="mb-2 text-sm text-destructive">{mixError}</p>}
          <button type="button" onClick={handleMix}
            className="rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700">
            Mix & Save
          </button>
        </div>
      )}

      {/* Mixing */}
      {phase === "mixing" && (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground animate-pulse">
          Mixing your recording…
        </div>
      )}

      {/* Mixed: result card */}
      {phase === "mixed" && mixedBlob && (
        <MixResultCard
          mp3Blob={mixedBlob}
          durationMs={mixedDurationMs}
          lessonTitle={lesson.title}
          criticalThinkingQuestion={lesson.criticalThinkingQuestion}
        />
      )}
    </div>
  );
}
