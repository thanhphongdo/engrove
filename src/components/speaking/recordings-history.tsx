"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Pause, Play, Trash2 } from "lucide-react";
import { DetailCard } from "@/components/lesson/detail-card";
import {
  useSpeakingRecordings,
  useDeleteSpeakingRecording,
} from "@/lib/db/use-speaking-recordings";

function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
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
    <div className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={handlePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="grid size-8 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/20"
      >
        {playing ? (
          <Pause className="size-3.5 fill-current" aria-hidden="true" />
        ) : (
          <Play className="size-3.5 fill-current" aria-hidden="true" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{formatDateTime(rec.completedAt)}</p>
        <p className="text-xs text-neutral-400">Role: {rec.role} · {formatDuration(rec.durationMs)}</p>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        aria-label="Download"
        className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-700 dark:hover:text-neutral-200"
      >
        <Download className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => deleteRecording(rec.id)}
        aria-label="Delete recording"
        className="shrink-0 text-neutral-400 transition-colors hover:text-destructive"
      >
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
    <DetailCard>
      <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">My recordings</h2>
      <div className="divide-y divide-neutral-100 text-sm dark:divide-white/5">
        {recordings.map((rec) => (
          <RecordingRow key={rec.id} rec={rec} lessonTitle={lessonTitle} />
        ))}
      </div>
    </DetailCard>
  );
}
