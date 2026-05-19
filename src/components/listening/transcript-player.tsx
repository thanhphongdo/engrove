"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useListeningAudioStore } from "@/stores/listening-audio-store";

const PRELOAD_AHEAD = 5;

export function TranscriptPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadCache = useRef(new Map<string, HTMLAudioElement>());

  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const status = useListeningAudioStore((s) => s.status);
  const sentences = useListeningAudioStore((s) => s.sentences);
  const cdnBase = useListeningAudioStore((s) => s.cdnBase);
  const manifestVersion = useListeningAudioStore((s) => s.manifestVersion);
  const setStatus = useListeningAudioStore((s) => s.setStatus);
  const advanceOnEnded = useListeningAudioStore((s) => s.advanceOnEnded);
  const setAudioEl = useListeningAudioStore((s) => s.setAudioEl);
  const clearPendingSeek = useListeningAudioStore((s) => s.clearPendingSeek);

  // Register the audio element in the store so PlaybackTimeline can read currentTime.
  useEffect(() => {
    setAudioEl(audioRef.current);
    return () => setAudioEl(null);
  }, [setAudioEl]);

  // Clear the preload cache whenever the lesson changes.
  useEffect(() => {
    const cache = preloadCache.current;
    cache.forEach((a) => { a.src = ""; a.load(); });
    cache.clear();
    return () => {
      cache.forEach((a) => { a.src = ""; a.load(); });
      cache.clear();
    };
  }, [sentences, cdnBase, manifestVersion]);

  // Extend the preload window as playback advances (batch of PRELOAD_AHEAD).
  useEffect(() => {
    if (!sentences.length || !cdnBase) return;
    const start = Math.max(0, currentIndex < 0 ? 0 : currentIndex);
    const end = Math.min(sentences.length, start + PRELOAD_AHEAD);
    for (let i = start; i < end; i++) {
      const s = sentences[i];
      const key = `${s.id}@${manifestVersion}`;
      if (!preloadCache.current.has(key)) {
        const a = new Audio();
        a.preload = "auto";
        a.src = `${cdnBase}/${s.id}.mp3?v=${manifestVersion}`;
        preloadCache.current.set(key, a);
      }
    }
  }, [sentences, cdnBase, manifestVersion, currentIndex]);

  // Load & play when entering "loading"; apply pending seek offset after play starts.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || status !== "loading" || currentIndex < 0 || !cdnBase) return;
    const s = sentences[currentIndex];
    if (!s) return;
    let cancelled = false;
    el.src = `${cdnBase}/${s.id}.mp3?v=${manifestVersion}`;
    el.play().then(
      () => {
        if (cancelled) return;
        const seekMs = useListeningAudioStore.getState().pendingSeekMs;
        if (seekMs !== null && seekMs > 0) {
          el.currentTime = seekMs / 1000;
          clearPendingSeek();
        }
        setStatus("playing");
      },
      (err) => {
        if (cancelled) return;
        if (el.error === null) {
          console.error("audio play failed", err);
          toast.error("Audio playback failed");
          setStatus("error");
        }
      },
    );
    return () => { cancelled = true; };
  }, [status, currentIndex, sentences, cdnBase, manifestVersion, setStatus, clearPendingSeek]);

  // Pause / resume.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (status === "paused" && !el.paused) el.pause();
    if (status === "playing" && el.paused && el.src) el.play().catch(() => {});
  }, [status]);

  // Stop on full reset.
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
