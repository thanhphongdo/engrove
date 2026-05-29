"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecorderButton } from "./recorder-button";
import { VoiceVisualizer } from "./voice-visualizer";

type TurnState =
  | "upcoming"
  | "system-playing"
  | "user-idle"
  | "user-recording"
  | "user-recorded"
  | "done";

type Props = {
  turnIndex: number;
  speaker: string;
  text: string;
  translationVi?: string;
  isUser: boolean;
  state: TurnState;
  onRecord: () => void;
  onStopRecording: () => void;
  onPlayback: () => void;
  onContinue: () => void;
  onPlayModel: () => void;
  getRmsLevel: () => number;
  hasBlob: boolean;
};

export function TurnRow({
  turnIndex,
  speaker,
  text,
  translationVi,
  isUser,
  state,
  onRecord,
  onStopRecording,
  onPlayback,
  onContinue,
  onPlayModel,
  getRmsLevel,
  hasBlob,
}: Props) {
  const isActive = state !== "upcoming" && state !== "done";
  const isDone = state === "done";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all",
        isActive && "border-primary/40 bg-primary/5 shadow-sm",
        isDone && "opacity-60",
        state === "upcoming" && "opacity-40",
        isUser ? "ml-8" : "mr-8",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">{isUser ? "🙋" : "🧑‍💼"}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{speaker}</span>
        {isDone && <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400">✓</span>}
      </div>

      <p className="mb-1 text-sm leading-relaxed">{text}</p>
      {translationVi && (
        <p className="mb-3 text-xs text-muted-foreground leading-relaxed">{translationVi}</p>
      )}

      {isActive && (
        <div className="flex flex-wrap items-center gap-2">
          {!isUser && state === "system-playing" && (
            <VoiceVisualizer getRmsLevel={() => 0.5} active className="mr-2" />
          )}

          {isUser && (
            <>
              <button
                type="button"
                onClick={onPlayModel}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
              >
                <Play className="size-3 fill-current" aria-hidden="true" />
                Play model
              </button>

              <RecorderButton
                state={
                  state === "user-recording" ? "recording"
                  : hasBlob ? "recorded"
                  : "idle"
                }
                onRecord={onRecord}
                onStop={onStopRecording}
              />

              {state === "user-recording" && (
                <VoiceVisualizer getRmsLevel={getRmsLevel} active />
              )}

              {hasBlob && state !== "user-recording" && (
                <>
                  <button
                    type="button"
                    onClick={onPlayback}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                  >
                    <Play className="size-3 fill-current" aria-hidden="true" />
                    Play back
                  </button>
                  <button
                    type="button"
                    onClick={onContinue}
                    className="ml-auto rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Continue →
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
