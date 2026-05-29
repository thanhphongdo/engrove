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
  const isRecorded = state === "recorded";

  return (
    <button
      type="button"
      onClick={isRecording ? onStop : onRecord}
      disabled={disabled}
      aria-label={isRecording ? "Finish recording" : isRecorded ? "Re-record this turn" : "Record this turn"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors",
        isRecording
          ? "bg-red-600 text-white hover:bg-red-700"
          : isRecorded
            ? "border bg-background hover:bg-accent"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {isRecording ? (
        <>
          <Square className="size-3 fill-current" aria-hidden="true" /> Finish
        </>
      ) : (
        <>
          <Mic className="size-3.5" aria-hidden="true" /> {isRecorded ? "Re-record" : "Record"}
        </>
      )}
    </button>
  );
}
