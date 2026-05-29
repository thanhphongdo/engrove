"use client";

import { useEffect, useRef } from "react";
import { Download } from "lucide-react";

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

type Props = {
  mp3Blob: Blob;
  durationMs: number;
  lessonTitle: string;
  criticalThinkingQuestion?: string;
};

export function MixResultCard({ mp3Blob, durationMs, lessonTitle, criticalThinkingQuestion }: Props) {
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(mp3Blob);
    urlRef.current = url;
    return () => URL.revokeObjectURL(url);
  }, [mp3Blob]);

  function handleDownload() {
    const url = urlRef.current;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lessonTitle.replace(/\s+/g, "-").toLowerCase()}-practice.wav`;
    a.click();
  }

  return (
    <div className="rounded-lg border bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">
          ✓ Saved to My recordings
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{formatDuration(durationMs)}</span>
      </div>

      {urlRef.current && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls src={urlRef.current} className="w-full" />
      )}

      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
      >
        <Download className="size-4" aria-hidden="true" />
        Download .wav
      </button>

      {criticalThinkingQuestion && (
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Think about it</p>
          <p className="text-sm">{criticalThinkingQuestion}</p>
        </div>
      )}
    </div>
  );
}
