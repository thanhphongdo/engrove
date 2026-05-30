"use client";

import { useEffect, useMemo } from "react";
import { Check, Download } from "lucide-react";
import { DetailCard } from "@/components/lesson/detail-card";

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

// A decorative, static combined waveform (the real playback is the <audio> below).
const WAVE_HEIGHTS = [50, 72, 45, 88, 60, 40, 78, 55, 90, 48, 65, 80, 52, 70, 44, 85, 58, 75, 50, 68, 42, 82, 60];

type Props = {
  mp3Blob: Blob;
  durationMs: number;
  lessonTitle: string;
  criticalThinkingQuestion?: string;
};

export function MixResultCard({ mp3Blob, durationMs, lessonTitle, criticalThinkingQuestion }: Props) {
  const url = useMemo(() => URL.createObjectURL(mp3Blob), [mp3Blob]);

  // Revoke the object URL when the blob changes or the card unmounts.
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  function handleDownload() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lessonTitle.replace(/\s+/g, "-").toLowerCase()}-practice.wav`;
    a.click();
  }

  return (
    <DetailCard className="mt-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Check className="size-3.5 text-emerald-500" strokeWidth={3} aria-hidden="true" />
          Saved to My recordings
        </span>
        <span className="text-xs text-neutral-400">{formatDuration(durationMs)}</span>
      </div>

      {/* Combined waveform + real playback control */}
      <div className="mt-3 flex flex-col gap-2 rounded-xl bg-neutral-50 p-2.5 dark:bg-white/5">
        <div className="relative flex h-7 items-end gap-px overflow-hidden" aria-hidden="true">
          {WAVE_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-emerald-100 dark:bg-emerald-900/60"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <audio controls src={url} className="h-9 w-full" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          <Download className="size-4" aria-hidden="true" /> Download .wav
        </button>
        {criticalThinkingQuestion && (
          <span className="text-neutral-500">
            <span className="font-semibold text-neutral-700 dark:text-neutral-200">Think about it:</span>{" "}
            {criticalThinkingQuestion}
          </span>
        )}
      </div>
    </DetailCard>
  );
}
