"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferences, useSetContentZoom } from "@/lib/db/use-preferences";
import {
  CONTENT_ZOOM_STEP,
  DEFAULT_CONTENT_ZOOM,
  MAX_CONTENT_ZOOM,
  MIN_CONTENT_ZOOM,
} from "@/lib/db/types";

function clamp(value: number) {
  return Math.max(MIN_CONTENT_ZOOM, Math.min(MAX_CONTENT_ZOOM, value));
}

// Avoid floating-point drift across many +/- presses (0.9 + 0.1 + 0.1 + ...).
function snap(value: number) {
  return Math.round(value * 10) / 10;
}

export function ContentZoomControl() {
  const { contentZoom } = usePreferences();
  const setZoom = useSetContentZoom();

  const decrease = () => setZoom(snap(clamp(contentZoom - CONTENT_ZOOM_STEP)));
  const increase = () => setZoom(snap(clamp(contentZoom + CONTENT_ZOOM_STEP)));
  const reset = () => setZoom(DEFAULT_CONTENT_ZOOM);

  const percent = Math.round(contentZoom * 100);

  return (
    <div
      className="flex items-center gap-1 rounded-md border bg-background p-1"
      role="group"
      aria-label="Content zoom"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        aria-label="Zoom out"
        onClick={decrease}
        disabled={contentZoom <= MIN_CONTENT_ZOOM}
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </Button>
      <button
        type="button"
        onClick={reset}
        title="Reset to default"
        aria-label={`Content zoom ${percent}%, click to reset`}
        className="flex-1 rounded px-1 text-center text-xs font-medium tabular-nums hover:bg-accent"
        style={{ fontFamily: "var(--app-font-mono)" }}
      >
        {percent}%
      </button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        aria-label="Zoom in"
        onClick={increase}
        disabled={contentZoom >= MAX_CONTENT_ZOOM}
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
