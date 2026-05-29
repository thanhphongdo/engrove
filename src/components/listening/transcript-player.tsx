"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { getOrBuildConcatTrack } from "@/lib/audio/concat-cache";

const IMMEDIATE_COUNT = 10;
const IDLE_BATCH = 5;

// requestIdleCallback is not available in all environments (e.g. SSR, some browsers).
const rIC: (cb: () => void) => void =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (cb) => (window as Window & typeof globalThis).requestIdleCallback(cb)
    : (cb) => setTimeout(cb, 50);

function indexFromMs(offsets: number[], globalMs: number): number {
  let idx = 0;
  for (let i = 0; i < offsets.length; i++) {
    if (offsets[i] <= globalMs) idx = i;
    else break;
  }
  return idx;
}

export function TranscriptPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadCache = useRef(new Map<string, HTMLAudioElement>());

  const lessonId = useListeningAudioStore((s) => s.lessonId);
  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const status = useListeningAudioStore((s) => s.status);
  const mode = useListeningAudioStore((s) => s.mode);
  const sentences = useListeningAudioStore((s) => s.sentences);
  const cdnBase = useListeningAudioStore((s) => s.cdnBase);
  const manifestVersion = useListeningAudioStore((s) => s.manifestVersion);
  const concatUrl = useListeningAudioStore((s) => s.concatUrl);
  const pendingSeekMs = useListeningAudioStore((s) => s.pendingSeekMs);
  const setConcat = useListeningAudioStore((s) => s.setConcat);
  const setStatus = useListeningAudioStore((s) => s.setStatus);
  const advanceOnEnded = useListeningAudioStore((s) => s.advanceOnEnded);
  const setAudioEl = useListeningAudioStore((s) => s.setAudioEl);
  const clearPendingSeek = useListeningAudioStore((s) => s.clearPendingSeek);
  const markReady = useListeningAudioStore((s) => s.markReady);
  const clearReady = useListeningAudioStore((s) => s.clearReady);

  // Register audio element in store so the scrubbers can read currentTime.
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

  // Eager preload (for single-sentence clicks): first IMMEDIATE_COUNT now, rest on idle.
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

  // Build (or load from cache) the gapless "Play all" track as soon as the
  // lesson is loaded — so by the time the user hits Play, it's ready.
  useEffect(() => {
    if (!lessonId || !cdnBase || !sentences.length || concatUrl) return;
    let cancelled = false;
    getOrBuildConcatTrack(lessonId, cdnBase, sentences.map((s) => s.id), manifestVersion)
      .then((track) => {
        if (cancelled) return;
        setConcat(lessonId, manifestVersion, URL.createObjectURL(track.blob), track.offsetsMs, track.totalMs);
      })
      .catch((err) => console.error("Failed to build Play-all track:", err));
    return () => { cancelled = true; };
  }, [lessonId, cdnBase, sentences, manifestVersion, concatUrl, setConcat]);

  // ── Single-sentence mode: swap src per sentence (unchanged). ──
  useEffect(() => {
    const el = audioRef.current;
    if (!el || mode !== "single" || status !== "loading" || currentIndex < 0 || !cdnBase) return;
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
  }, [mode, status, currentIndex, sentences, cdnBase, manifestVersion, setStatus, clearPendingSeek]);

  // Ensure the Play-all element holds the concat track whenever we're in
  // play-all mode (even when only cued/paused) so its currentTime can be set
  // and the scrubber shows the right position.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || mode !== "playAll" || !concatUrl) return;
    if (el.src !== concatUrl) el.src = concatUrl;
  }, [mode, concatUrl]);

  // ── Play-all mode: one gapless concatenated track. ──
  // Starts (or waits for) the concat track when status enters "loading".
  useEffect(() => {
    const el = audioRef.current;
    if (!el || mode !== "playAll" || status !== "loading") return;
    if (!concatUrl) return; // build still in flight — re-runs when concatUrl arrives
    let cancelled = false;
    if (el.src !== concatUrl) el.src = concatUrl;
    el.play().then(
      () => {
        if (cancelled) return;
        const seekMs = useListeningAudioStore.getState().pendingSeekMs;
        if (seekMs !== null) {
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
  }, [mode, status, concatUrl, setStatus, clearPendingSeek]);

  // Seek within the concat track (scrubber / keyboard / sentence jump / cue).
  // When the track was just assigned, metadata may not be ready yet, so defer
  // the currentTime set until it is — otherwise the seek is silently dropped.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || mode !== "playAll" || !concatUrl || status === "loading") return;
    if (pendingSeekMs == null) return;
    const seconds = pendingSeekMs / 1000;
    if (el.readyState >= 1) {
      el.currentTime = seconds;
    } else {
      const apply = () => { el.currentTime = seconds; };
      el.addEventListener("loadedmetadata", apply, { once: true });
    }
    clearPendingSeek();
  }, [pendingSeekMs, mode, concatUrl, status, clearPendingSeek]);

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

  function handleTimeUpdate() {
    const s = useListeningAudioStore.getState();
    if (s.mode !== "playAll") return;
    const el = audioRef.current;
    if (!el) return;
    const ms = el.currentTime * 1000;
    // Sentence preview: pause exactly at the requested boundary.
    if (s.playUntilMs != null && ms >= s.playUntilMs) {
      el.pause();
      s.setStatus("paused");
      s.clearPlayUntil();
      return;
    }
    if (s.concatOffsetsMs.length) s.setCurrentIndex(indexFromMs(s.concatOffsetsMs, ms));
  }

  return (
    <audio
      ref={audioRef}
      preload="auto"
      onEnded={advanceOnEnded}
      onTimeUpdate={handleTimeUpdate}
      onError={() => {
        toast.error("Audio file failed to load");
        setStatus("error");
      }}
      className="hidden"
    />
  );
}
