"use client";

import { Check, Play } from "lucide-react";
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
  const isRecording = state === "user-recording";

  return (
    <div
      className={cn(
        "flex max-w-[85%] gap-2.5 transition-opacity",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto",
        state === "upcoming" && "opacity-40",
        isDone && !isActive && "opacity-70",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "mt-5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm",
          isUser ? "bg-primary/15" : "bg-muted",
        )}
        aria-hidden="true"
      >
        {isUser ? "🙋" : "🧑‍💼"}
      </div>

      <div className={cn("flex min-w-0 flex-col", isUser && "items-end")}>
        <div className="mb-1 flex items-center gap-1.5">
          {isActive && isUser && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary">● Your turn</span>
          )}
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {speaker}
          </span>
          {isDone && <Check className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
            isUser ? "bg-primary/10" : "bg-muted",
            isActive && "ring-2 ring-primary",
          )}
        >
          {text}
          {translationVi && (
            <p className="mt-1 text-xs text-muted-foreground">{translationVi}</p>
          )}
        </div>

        {/* Action row */}
        {isActive && (
          <div className={cn("mt-2 flex flex-wrap items-center gap-2", isUser && "justify-end")}>
            {!isUser && state === "system-playing" && (
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <VoiceVisualizer getRmsLevel={() => 0.5} active />
                Playing…
              </span>
            )}

            {isUser && (
              <>
                {!isRecording && (
                  <button
                    type="button"
                    onClick={onPlayModel}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                  >
                    <Play className="size-3 fill-current" aria-hidden="true" />
                    Play model
                  </button>
                )}

                <RecorderButton
                  state={isRecording ? "recording" : hasBlob ? "recorded" : "idle"}
                  onRecord={onRecord}
                  onStop={onStopRecording}
                />

                {isRecording && (
                  <>
                    <VoiceVisualizer getRmsLevel={getRmsLevel} active />
                    <span className="text-[11px] text-muted-foreground">auto-stops when you pause</span>
                  </>
                )}

                {hasBlob && !isRecording && (
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
                      className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
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
    </div>
  );
}
