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
  if (state === "recording") {
    return (
      <button
        type="button"
        onClick={onStop}
        className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-red-600 active:scale-95"
      >
        <Square className="size-3.5 fill-white" aria-hidden="true" />
        Stop
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onRecord}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-colors",
        state === "recorded"
          ? "border bg-background hover:bg-accent"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Mic className="size-3.5" aria-hidden="true" />
      {state === "recorded" ? "Re-record" : "Record"}
    </button>
  );
}
