"use client";

import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

type RecorderState = "idle" | "recording" | "recorded";

type Props = {
  state: RecorderState;
  onRecord: () => void;
  onStop: () => void;
  disabled?: boolean;
};

function AudioBarsIcon() {
  return (
    <span className="inline-flex items-end gap-px h-3.5" aria-hidden="true">
      {[0, 0.14, 0.28, 0.07].map((delay, i) => (
        <span
          key={i}
          className="w-0.75 bg-current rounded-sm animate-audio-bar"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}

export function RecorderButton({ state, onRecord, onStop, disabled }: Props) {
  const isRecording = state === "recording";
  const isRecorded = state === "recorded";

  return (
    <button
      type="button"
      onClick={isRecording ? onStop : onRecord}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-colors",
        isRecorded
          ? "border bg-background hover:bg-accent"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {isRecording ? <AudioBarsIcon /> : <Mic className="size-3.5" aria-hidden="true" />}
      {isRecording ? "Recording…" : isRecorded ? "Re-record" : "Record"}
    </button>
  );
}
