"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useListeningAudioStore } from "@/stores/listening-audio-store";

const IMMEDIATE_COUNT = 10;
const IDLE_BATCH = 5;

// requestIdleCallback is not available in all environments (e.g. SSR, some browsers).
const rIC: (cb: () => void) => void =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (cb) => (window as Window & typeof globalThis).requestIdleCallback(cb)
    : (cb) => setTimeout(cb, 50);

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
  const markReady = useListeningAudioStore((s) => s.markReady);
  const clearReady = useListeningAudioStore((s) => s.clearReady);

  // Register audio element in store so PlaybackTimeline can read currentTime.
  useEffect(() => {
    setAudioEl(audioRef.current);
    return () => setAudioEl(null);
  }, [setAudioEl]);

  // Clear preload cache + readySet on lesson change.
  useEffect(() => {
    const cache = preloadCache.current;
    clearReady();
    cache.forEach((a) => { a.src = ""; a.load(); });
    cache.clear();
    return () => {
      clearReady();
      cache.forEach((a) => { a.src = ""; a.load(); });
      cache.clear();
    };
  }, [sentences, cdnBase, manifestVersion, clearReady]);

  // Eager preload: first IMMEDIATE_COUNT sentences now, rest via requestIdleCallback batches.
  useEffect(() => {
    if (!sentences.length || !cdnBase) return;

    function loadOne(i: number) {
      const s = sentences[i];
      const key = `${s.id}@${manifestVersion}`;
      if (preloadCache.current.has(key)) return;
      const a = new Audio();
      a.preload = "auto";
      a.src = `${cdnBase}/${s.id}.mp3?v=${manifestVersion}`;
      a.oncanplaythrough = () => markReady(i);
      // Already in browser cache — mark ready synchronously.
      if (a.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) markReady(i);
      preloadCache.current.set(key, a);
    }

    const immediate = Math.min(IMMEDIATE_COUNT, sentences.length);
    for (let i = 0; i < immediate; i++) loadOne(i);

    let next = immediate;
    function idleLoad() {
      if (!cdnBase || next >= sentences.length) return;
      const end = Math.min(sentences.length, next + IDLE_BATCH);
      for (let i = next; i < end; i++) loadOne(i);
      next = end;
      if (next < sentences.length) rIC(idleLoad);
    }
    if (next < sentences.length) rIC(idleLoad);
  }, [sentences, cdnBase, manifestVersion, markReady]);

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
