"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useListeningAudioStore } from "@/stores/listening-audio-store";

export function TranscriptPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const status = useListeningAudioStore((s) => s.status);
  const sentences = useListeningAudioStore((s) => s.sentences);
  const cdnBase = useListeningAudioStore((s) => s.cdnBase);
  const manifestVersion = useListeningAudioStore((s) => s.manifestVersion);
  const setStatus = useListeningAudioStore((s) => s.setStatus);
  const advanceOnEnded = useListeningAudioStore((s) => s.advanceOnEnded);

  // load & play when entering "loading"
  useEffect(() => {
    const el = audioRef.current;
    if (!el || status !== "loading" || currentIndex < 0 || !cdnBase) return;
    const s = sentences[currentIndex];
    if (!s) return;
    let cancelled = false;
    el.src = `${cdnBase}/${s.id}.mp3?v=${manifestVersion}`;
    el.play().then(
      () => { if (!cancelled) setStatus("playing"); },
      (err) => {
        if (cancelled) return;
        // Only show the play-rejection toast when onError didn't already fire.
        // (onError fires first for network failures; this path catches other errors.)
        if (el.error === null) {
          console.error("audio play failed", err);
          toast.error("Audio playback failed");
          setStatus("error");
        }
      },
    );
    return () => { cancelled = true; };
  }, [status, currentIndex, sentences, cdnBase, manifestVersion, setStatus]);

  // pause/resume
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (status === "paused" && !el.paused) el.pause();
    if (status === "playing" && el.paused && el.src) el.play().catch(() => {});
  }, [status]);

  // stop on full reset
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (status === "idle") {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
  }, [status]);

  return (
    <audio
      ref={audioRef}
      preload="auto"
      onEnded={advanceOnEnded}
      onError={() => {
        toast.error("Audio file failed to load");
        setStatus("error");
      }}
      className="hidden"
    />
  );
}
