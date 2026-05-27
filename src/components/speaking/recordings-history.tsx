"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Play, Trash2 } from "lucide-react";
import {
  useSpeakingRecordings,
  useDeleteSpeakingRecording,
} from "@/lib/db/use-speaking-recordings";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function RecordingRow({ rec, lessonTitle }: { rec: { id: string; role: string; completedAt: number; durationMs: number; mp3Blob: Blob }; lessonTitle: string }) {
  const deleteRecording = useDeleteSpeakingRecording();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(rec.mp3Blob);
    urlRef.current = url;
    return () => URL.revokeObjectURL(url);
  }, [rec.mp3Blob]);

  function handlePlay() {
    if (!urlRef.current) return;
    if (!audioRef.current) audioRef.current = new Audio(urlRef.current);
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setPlaying(true);
      audioRef.current.onended = () => setPlaying(false);
    }
  }

  function handleDownload() {
    if (!urlRef.current) return;
    const a = document.createElement("a");
    a.href = urlRef.current;
    a.download = `${lessonTitle.replace(/\s+/g, "-").toLowerCase()}-${rec.role}-${rec.completedAt}.mp3`;
    a.click();
  }

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">As {rec.role}</p>
        <p className="text-xs text-muted-foreground">{formatDate(rec.completedAt)} · {formatDuration(rec.durationMs)}</p>
      </div>
      <button type="button" onClick={handlePlay} aria-label={playing ? "Pause" : "Play"} className="shrink-0 rounded-full p-1.5 hover:bg-accent">
        <Play className="size-4 fill-current" aria-hidden="true" />
      </button>
      <button type="button" onClick={handleDownload} aria-label="Download" className="shrink-0 rounded-full p-1.5 hover:bg-accent">
        <Download className="size-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={() => deleteRecording(rec.id)} aria-label="Delete recording" className="shrink-0 rounded-full p-1.5 text-destructive hover:bg-destructive/10">
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

type Props = { lessonId: string; lessonTitle: string };

export function RecordingsHistory({ lessonId, lessonTitle }: Props) {
  const recordings = useSpeakingRecordings(lessonId);

  if (!recordings || recordings.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-semibold">My recordings</h2>
      <div className="space-y-2">
        {recordings.map((rec) => (
          <RecordingRow key={rec.id} rec={rec} lessonTitle={lessonTitle} />
        ))}
      </div>
    </section>
  );
}
