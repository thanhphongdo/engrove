"use client";

import { Check, Play, RotateCcw } from "lucide-react";
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

/** A speech bubble with an approximate tail tucked into its lower corner. */
function Bubble({
  isUser,
  tone,
  children,
}: {
  isUser: boolean;
  tone: "in" | "out" | "upcoming";
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] px-4 py-2.5 text-sm",
          // Real chat tail (see .chat / .chat-out / .chat-in in globals.css);
          // upcoming turns are a dashed placeholder with no tail.
          tone === "upcoming"
            ? "rounded-2xl border border-dashed border-neutral-300 text-neutral-400 dark:border-white/15"
            : "chat rounded-[1.25rem]",
          tone === "out" && "chat-out bg-emerald-600 text-white",
          tone === "in" && "chat-in bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
        )}
      >
        {children}
      </div>
    </div>
  );
}

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
  const isUpcoming = state === "upcoming";

  const tone: "in" | "out" | "upcoming" = isUpcoming ? "upcoming" : isUser ? "out" : "in";

  return (
    <div className={cn(isUpcoming && "opacity-40")}>
      {/* Role label + completion check */}
      <div
        className={cn(
          "mb-1 flex items-center gap-1.5",
          isUser && "justify-end",
        )}
      >
        {isDone && isUser && (
          <Check className="size-3 text-emerald-500" strokeWidth={3} aria-hidden="true" />
        )}
        {isActive && isUser && (
          <span className="text-[0.625rem] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            ● Your turn
          </span>
        )}
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-neutral-400">
          {speaker}
        </span>
        {isDone && !isUser && (
          <Check className="size-3 text-emerald-500" strokeWidth={3} aria-hidden="true" />
        )}
      </div>

      {/* Bubble */}
      <Bubble isUser={isUser} tone={tone}>
        {text}
        {translationVi && (
          <span
            className={cn(
              "mt-1 block text-xs",
              tone === "out" ? "text-white/75" : "text-neutral-500 dark:text-neutral-400",
            )}
          >
            {translationVi}
          </span>
        )}
      </Bubble>

      {/* Action row */}
      {isActive && !isUser && state === "system-playing" && (
        <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
          <VoiceVisualizer getRmsLevel={() => 0.5} active />
          Playing…
        </div>
      )}

      {isActive && isUser && hasBlob && !isRecording && (
        <div className="mt-1.5 flex flex-wrap items-center justify-end gap-3 text-xs">
          <button
            type="button"
            onClick={onPlayback}
            className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            <Play className="size-3 fill-current" aria-hidden="true" /> Your take
          </button>
          <button
            type="button"
            onClick={onRecord}
            className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            <RotateCcw className="size-3" aria-hidden="true" /> Re-record
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-full bg-emerald-600 px-4 py-1.5 font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500"
          >
            Continue →
          </button>
        </div>
      )}

      {isActive && isUser && !(hasBlob && !isRecording) && (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
          {!isRecording && (
            <button
              type="button"
              onClick={onPlayModel}
              className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              <Play className="size-3 fill-current" aria-hidden="true" /> Play model
            </button>
          )}

          {isRecording && (
            <>
              <VoiceVisualizer getRmsLevel={getRmsLevel} active className="h-4" />
              <span className="text-[0.6875rem] text-neutral-400">auto-stops when you pause</span>
            </>
          )}

          <RecorderButton
            state={isRecording ? "recording" : "idle"}
            onRecord={onRecord}
            onStop={onStopRecording}
          />
        </div>
      )}
    </div>
  );
}
