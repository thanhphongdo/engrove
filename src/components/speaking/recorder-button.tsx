"use client";

import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type RecorderState = "idle" | "recording" | "recorded";

type Props = {
  state: RecorderState;
  onRecord: () => void;
  onStop: () => void;
  disabled?: boolean;
};

export function RecorderButton({ state, onRecord, onStop, disabled }: Props) {
  const isRecording = state === "recording";

  if (isRecording) {
    return (
      <span className="relative grid size-9 shrink-0 place-items-center">
        {/* Approximate the mockup's expanding "rec-ring" with a pulsing halo. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-red-500/40"
        />
        <button
          type="button"
          onClick={onStop}
          disabled={disabled}
          aria-label="Finish recording"
          className={cn(
            "relative grid size-9 place-items-center rounded-full bg-red-600 text-white shadow hover:bg-red-700",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <Square className="size-3.5 fill-current" aria-hidden="true" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onRecord}
      disabled={disabled}
      aria-label={state === "recorded" ? "Re-record this turn" : "Record this turn"}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow transition-transform hover:bg-emerald-700 active:scale-95 dark:bg-emerald-500",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Mic className="size-4" aria-hidden="true" />
    </button>
  );
}
