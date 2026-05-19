# Audio Preload + Inline Playback Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flickering `PlayAllButton` with a seamless inline scrubber, preload all lesson audio eagerly via idle callbacks, and show the fixed bottom timeline only when the inline bar scrolls out of view.

**Architecture:** Extend the Zustand audio store with `readySet` (per-sentence buffer readiness) and `inlineBarVisible` (drives bottom-bar show/hide). `TranscriptPlayer` loads all audio on mount — first 10 immediately, the rest via `requestIdleCallback` batches — and calls `markReady(i)` on `canplaythrough`. A new `InlinePlaybackBar` registers an `IntersectionObserver` to set `inlineBarVisible`; the fixed `PlaybackTimeline` gates on `!inlineBarVisible`.

**Tech Stack:** Zustand, React hooks (`useEffect`, `useMemo`, `useRef`), `IntersectionObserver`, `requestIdleCallback` (with `setTimeout(cb, 50)` fallback), Vitest + Testing Library (jsdom)

---

### Task 1: Extend store — readySet + inlineBarVisible

**Files:**
- Modify: `src/stores/listening-audio-store.ts`
- Modify: `src/stores/listening-audio-store.test.ts`

- [ ] **Step 1: Write failing tests — append to existing test file**

Append these two `describe` blocks to `src/stores/listening-audio-store.test.ts`:

```ts
describe("readySet", () => {
  beforeEach(() => {
    useListeningAudioStore.getState().stop();
    useListeningAudioStore.getState().clearReady();
  });

  it("starts empty", () => {
    expect(useListeningAudioStore.getState().readySet.size).toBe(0);
  });

  it("markReady adds an index", () => {
    useListeningAudioStore.getState().markReady(2);
    expect(useListeningAudioStore.getState().readySet.has(2)).toBe(true);
  });

  it("markReady is idempotent — same Set reference on duplicate call", () => {
    useListeningAudioStore.getState().markReady(0);
    const ref = useListeningAudioStore.getState().readySet;
    useListeningAudioStore.getState().markReady(0);
    expect(useListeningAudioStore.getState().readySet).toBe(ref);
  });

  it("clearReady empties the set", () => {
    useListeningAudioStore.getState().markReady(0);
    useListeningAudioStore.getState().markReady(1);
    useListeningAudioStore.getState().clearReady();
    expect(useListeningAudioStore.getState().readySet.size).toBe(0);
  });

  it("stop() resets readySet", () => {
    useListeningAudioStore.getState().markReady(0);
    useListeningAudioStore.getState().stop();
    expect(useListeningAudioStore.getState().readySet.size).toBe(0);
  });
});

describe("inlineBarVisible", () => {
  it("starts true", () => {
    expect(useListeningAudioStore.getState().inlineBarVisible).toBe(true);
  });

  it("setInlineBarVisible updates the field", () => {
    useListeningAudioStore.getState().setInlineBarVisible(false);
    expect(useListeningAudioStore.getState().inlineBarVisible).toBe(false);
    useListeningAudioStore.getState().setInlineBarVisible(true);
    expect(useListeningAudioStore.getState().inlineBarVisible).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — confirm failures**

```bash
npx vitest run src/stores/listening-audio-store.test.ts
```
Expected: `readySet` and `inlineBarVisible` describe blocks fail (fields don't exist yet); existing tests pass.

- [ ] **Step 3: Replace `listening-audio-store.ts`**

```ts
import { create } from "zustand";
import type { Sentence } from "@/lib/lessons/types";

export type AudioStatus = "idle" | "loading" | "playing" | "paused" | "error";
export type PlayMode = "single" | "playAll";

type State = {
  lessonId: string | null;
  cdnBase: string | null;
  sentences: Sentence[];
  currentIndex: number;
  status: AudioStatus;
  mode: PlayMode | null;
  manifestVersion: number;
  audioEl: HTMLAudioElement | null;
  pendingSeekMs: number | null;
  readySet: ReadonlySet<number>;
  inlineBarVisible: boolean;

  load: (lessonId: string, cdnBase: string, sentences: Sentence[], manifestVersion?: number) => void;
  playSingle: (lessonId: string, cdnBase: string, sentences: Sentence[], index: number, manifestVersion?: number) => void;
  playAll: (lessonId: string, cdnBase: string, sentences: Sentence[], fromIndex?: number, manifestVersion?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  advanceOnEnded: () => void;
  setStatus: (status: AudioStatus) => void;
  setAudioEl: (el: HTMLAudioElement | null) => void;
  clearPendingSeek: () => void;
  seekToGlobalMs: (globalMs: number) => void;
  markReady: (index: number) => void;
  clearReady: () => void;
  setInlineBarVisible: (v: boolean) => void;
};

export const useListeningAudioStore = create<State>((set, get) => ({
  lessonId: null,
  cdnBase: null,
  sentences: [],
  currentIndex: -1,
  status: "idle",
  mode: null,
  manifestVersion: 1,
  audioEl: null,
  pendingSeekMs: null,
  readySet: new Set<number>() as ReadonlySet<number>,
  inlineBarVisible: true,

  load(lessonId, cdnBase, sentences, manifestVersion = 1) {
    if (get().lessonId === lessonId) return;
    set({ lessonId, cdnBase, sentences, manifestVersion, readySet: new Set() });
  },

  playSingle(lessonId, cdnBase, sentences, index, manifestVersion = 1) {
    if (index < 0 || index >= sentences.length) return;
    const s = get();
    const isResume =
      s.status === "paused" &&
      s.lessonId === lessonId &&
      s.currentIndex === index &&
      s.mode === "single";
    set({
      lessonId,
      cdnBase,
      sentences,
      currentIndex: index,
      status: isResume ? "playing" : "loading",
      mode: "single",
      manifestVersion,
      pendingSeekMs: null,
    });
  },

  playAll(lessonId, cdnBase, sentences, fromIndex, manifestVersion = 1) {
    if (sentences.length === 0) return;
    const s = get();
    const isResumeFromPaused =
      s.status === "paused" &&
      s.lessonId === lessonId &&
      s.mode === "playAll" &&
      s.currentIndex >= 0;
    const startIndex =
      fromIndex !== undefined
        ? fromIndex
        : isResumeFromPaused
        ? s.currentIndex
        : 0;
    set({
      lessonId,
      cdnBase,
      sentences,
      currentIndex: startIndex,
      status: isResumeFromPaused && fromIndex === undefined ? "playing" : "loading",
      mode: "playAll",
      manifestVersion,
      pendingSeekMs: null,
    });
  },

  pause() {
    if (get().status === "playing") set({ status: "paused" });
  },

  resume() {
    if (get().status === "paused") set({ status: "playing" });
  },

  stop() {
    set({
      lessonId: null,
      cdnBase: null,
      sentences: [],
      currentIndex: -1,
      status: "idle",
      mode: null,
      pendingSeekMs: null,
      readySet: new Set(),
    });
  },

  advanceOnEnded() {
    const s = get();
    if (s.mode === "playAll" && s.currentIndex < s.sentences.length - 1) {
      set({ currentIndex: s.currentIndex + 1, status: "loading", pendingSeekMs: null });
    } else {
      get().stop();
    }
  },

  setStatus(status) {
    set({ status });
  },

  setAudioEl(el) {
    set({ audioEl: el });
  },

  clearPendingSeek() {
    set({ pendingSeekMs: null });
  },

  seekToGlobalMs(globalMs: number) {
    const { sentences, mode } = get();
    if (!sentences.length) return;
    let accumulated = 0;
    let targetIdx = 0;
    let offsetMs = 0;
    for (let i = 0; i < sentences.length; i++) {
      const dur = sentences[i].durationMs ?? 0;
      if (accumulated + dur > globalMs || i === sentences.length - 1) {
        targetIdx = i;
        offsetMs = Math.max(0, globalMs - accumulated);
        break;
      }
      accumulated += dur;
    }
    set({
      currentIndex: targetIdx,
      status: "loading",
      mode: mode === "playAll" ? "playAll" : "single",
      pendingSeekMs: offsetMs,
    });
  },

  markReady(index) {
    const prev = get().readySet;
    if (prev.has(index)) return;
    set({ readySet: new Set([...prev, index]) });
  },

  clearReady() {
    set({ readySet: new Set() });
  },

  setInlineBarVisible(v) {
    set({ inlineBarVisible: v });
  },
}));
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
npx vitest run src/stores/listening-audio-store.test.ts
```
Expected: all tests pass (old + new).

- [ ] **Step 5: Commit**

```bash
git add src/stores/listening-audio-store.ts src/stores/listening-audio-store.test.ts
git commit -m "feat(store): add readySet, inlineBarVisible, markReady, clearReady, setInlineBarVisible"
```

---

### Task 2: Update TranscriptPlayer — full eager preload + canplaythrough → markReady

**Files:**
- Modify: `src/components/listening/transcript-player.tsx`

- [ ] **Step 1: Replace `transcript-player.tsx`**

```ts
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/listening/transcript-player.tsx
git commit -m "feat(player): eager preload all audio via requestIdleCallback + canplaythrough markReady"
```

---

### Task 3: Create InlinePlaybackBar

**Files:**
- Create: `src/components/listening/inline-playback-bar.tsx`
- Create: `src/components/listening/inline-playback-bar.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/listening/inline-playback-bar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InlinePlaybackBar } from "./inline-playback-bar";
import { useListeningAudioStore } from "@/stores/listening-audio-store";

// jsdom does not implement IntersectionObserver or pointer capture.
vi.stubGlobal("IntersectionObserver", class {
  observe() {}
  disconnect() {}
});

beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  useListeningAudioStore.getState().stop();
  useListeningAudioStore.getState().clearReady();
});

const sentences = [
  { id: "s1", speaker: "A", text: "Hello.", durationMs: 2000 },
  { id: "s2", speaker: "A", text: "World.", durationMs: 3000 },
];

const defaultProps = {
  lessonId: "lesson-1",
  cdnBase: "https://cdn",
  manifestVersion: 1,
  sentences,
  totalDurationMs: 5000, // 5s
};

describe("InlinePlaybackBar", () => {
  it("renders a play button when idle", () => {
    render(<InlinePlaybackBar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /play all/i })).toBeInTheDocument();
  });

  it("shows formatted duration in idle play button", () => {
    render(<InlinePlaybackBar {...defaultProps} />);
    // totalDurationMs 5000ms → "5s"
    expect(screen.getByRole("button", { name: /play all/i })).toHaveTextContent("5s");
  });

  it("calls playAll when idle button is clicked", () => {
    const playAll = vi.spyOn(useListeningAudioStore.getState(), "playAll");
    render(<InlinePlaybackBar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /play all/i }));
    expect(playAll).toHaveBeenCalledWith("lesson-1", "https://cdn", sentences, undefined, 1);
  });

  it("renders scrubber slider when playAll is active for this lesson", () => {
    useListeningAudioStore.setState({
      lessonId: "lesson-1",
      mode: "playAll",
      status: "playing",
      currentIndex: 0,
    });
    render(<InlinePlaybackBar {...defaultProps} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("shows play button (not scrubber) when a different lesson is playing", () => {
    useListeningAudioStore.setState({
      lessonId: "other-lesson",
      mode: "playAll",
      status: "playing",
    });
    render(<InlinePlaybackBar {...defaultProps} />);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play all/i })).toBeInTheDocument();
  });

  it("blocks seek beyond bufferedMs — seekToGlobalMs not called", () => {
    useListeningAudioStore.setState({
      lessonId: "lesson-1",
      mode: "playAll",
      status: "playing",
      currentIndex: 0,
    });
    // Only sentence 0 ready → bufferedMs = 2000ms = 40% of 5000ms
    useListeningAudioStore.getState().markReady(0);

    const seekToGlobalMs = vi.spyOn(
      useListeningAudioStore.getState(),
      "seekToGlobalMs",
    );

    render(<InlinePlaybackBar {...defaultProps} />);
    const slider = screen.getByRole("slider");

    Object.defineProperty(slider, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 200, top: 0, height: 14, right: 200, bottom: 14 }),
      configurable: true,
    });

    // Drag to 90% = 4500ms, which exceeds bufferedMs (2000ms).
    fireEvent.pointerDown(slider, { clientX: 10, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 180, pointerId: 1 });

    expect(seekToGlobalMs).not.toHaveBeenCalled();
  });

  it("allows seek within bufferedMs — seekToGlobalMs called", () => {
    useListeningAudioStore.setState({
      lessonId: "lesson-1",
      mode: "playAll",
      status: "playing",
      currentIndex: 0,
    });
    // Both sentences ready → bufferedMs = 5000ms
    useListeningAudioStore.getState().markReady(0);
    useListeningAudioStore.getState().markReady(1);

    const seekToGlobalMs = vi.spyOn(
      useListeningAudioStore.getState(),
      "seekToGlobalMs",
    );

    render(<InlinePlaybackBar {...defaultProps} />);
    const slider = screen.getByRole("slider");

    Object.defineProperty(slider, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 200, top: 0, height: 14, right: 200, bottom: 14 }),
      configurable: true,
    });

    // Drag to 50% = 2500ms, within 5000ms buffer.
    fireEvent.pointerDown(slider, { clientX: 10, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 100, pointerId: 1 });

    expect(seekToGlobalMs).toHaveBeenCalledWith(2500);
  });
});
```

- [ ] **Step 2: Run tests — confirm failures**

```bash
npx vitest run src/components/listening/inline-playback-bar.test.tsx
```
Expected: all tests fail (module not found).

- [ ] **Step 3: Create `inline-playback-bar.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { cn } from "@/lib/utils";
import type { Sentence } from "@/lib/lessons/types";

function fmtMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function InlinePlaybackBar({
  lessonId,
  cdnBase,
  manifestVersion,
  sentences,
  totalDurationMs,
}: {
  lessonId: string;
  cdnBase: string;
  manifestVersion: number;
  sentences: Sentence[];
  totalDurationMs: number | undefined;
}) {
  const currentLessonId = useListeningAudioStore((s) => s.lessonId);
  const mode = useListeningAudioStore((s) => s.mode);
  const status = useListeningAudioStore((s) => s.status);
  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const audioEl = useListeningAudioStore((s) => s.audioEl);
  const readySet = useListeningAudioStore((s) => s.readySet);
  const playAll = useListeningAudioStore((s) => s.playAll);
  const pause = useListeningAudioStore((s) => s.pause);
  const resume = useListeningAudioStore((s) => s.resume);
  const seekToGlobalMs = useListeningAudioStore((s) => s.seekToGlobalMs);
  const setInlineBarVisible = useListeningAudioStore((s) => s.setInlineBarVisible);

  const [currentMs, setCurrentMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMs, setDragMs] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  const isOurLesson = currentLessonId === lessonId;
  const isActive = isOurLesson && mode === "playAll" && status !== "idle";
  const isPlaying = isActive && status === "playing";

  // Report visibility to store — bottom PlaybackTimeline shows when this is false.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInlineBarVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      setInlineBarVisible(true); // Reset on unmount so the next lesson starts clean.
    };
  }, [setInlineBarVisible]);

  const offsets = useMemo(() => {
    const result: number[] = [];
    let acc = 0;
    for (const s of sentences) {
      result.push(acc);
      acc += s.durationMs ?? 0;
    }
    return result;
  }, [sentences]);

  const totalMs = useMemo(
    () => sentences.reduce((acc, s) => acc + (s.durationMs ?? 0), 0),
    [sentences],
  );

  // RAF loop — keep scrub position in sync with live audio element.
  useEffect(() => {
    if (!isActive) {
      setCurrentMs(0);
      return;
    }
    function tick() {
      if (audioEl && currentIndex >= 0) {
        setCurrentMs((offsets[currentIndex] ?? 0) + audioEl.currentTime * 1000);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, audioEl, currentIndex, offsets]);

  // Contiguous buffered duration starting from sentence 0.
  const bufferedMs = useMemo(() => {
    let ms = 0;
    for (let i = 0; i < sentences.length; i++) {
      if (!readySet.has(i)) break;
      ms += sentences[i].durationMs ?? 0;
    }
    return ms;
  }, [sentences, readySet]);

  function msFromPointer(clientX: number): number {
    const track = trackRef.current;
    if (!track || totalMs === 0) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * totalMs;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragMs(msFromPointer(e.clientX));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setDragMs(msFromPointer(e.clientX));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const ms = msFromPointer(e.clientX);
    setIsDragging(false);
    if (ms > bufferedMs) return; // Block seek to unbuffered region.
    seekToGlobalMs(ms);
  }

  const displayMs = isDragging ? dragMs : currentMs;
  const progressPct = totalMs > 0 ? Math.min(100, (displayMs / totalMs) * 100) : 0;
  const bufferedPct = totalMs > 0 ? Math.min(100, (bufferedMs / totalMs) * 100) : 0;
  const audioPending = totalDurationMs === undefined;

  return (
    <div ref={barRef} className="flex min-w-0 flex-1 items-center gap-2">
      {!isActive ? (
        <button
          type="button"
          aria-label={audioPending ? "audio pending" : `Play all ${fmtDuration(totalDurationMs!)}`}
          onClick={() => playAll(lessonId, cdnBase, sentences, undefined, manifestVersion)}
          disabled={audioPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="size-3.5" />
          {audioPending ? "audio pending" : `Play all (${fmtDuration(totalDurationMs!)})`}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={isPlaying ? pause : resume}
            aria-label={isPlaying ? "Pause" : "Resume"}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:opacity-90 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="size-3.5" aria-hidden="true" />
            ) : (
              <Play className="size-3.5 translate-x-px" aria-hidden="true" />
            )}
          </button>

          <div
            ref={trackRef}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={totalMs}
            aria-valuenow={Math.round(displayMs)}
            aria-label="Playback position"
            tabIndex={0}
            className="relative flex h-7 flex-1 cursor-pointer touch-none select-none items-center"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={(e) => {
              const step = totalMs * 0.02;
              if (e.key === "ArrowRight")
                seekToGlobalMs(Math.min(bufferedMs, currentMs + step));
              if (e.key === "ArrowLeft")
                seekToGlobalMs(Math.max(0, currentMs - step));
            }}
          >
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
              {/* Buffered region — lighter tint under the played fill */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary/20"
                style={{ width: `${bufferedPct}%` }}
              />
              {/* Played region */}
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full bg-primary",
                  !isDragging && "transition-[width] duration-100 ease-linear",
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {/* Drag handle */}
            <div
              className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow"
              style={{ left: `${progressPct}%` }}
            />
          </div>

          <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
            {fmtMs(displayMs)} / {fmtMs(totalMs)}
          </span>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
npx vitest run src/components/listening/inline-playback-bar.test.tsx
```
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/listening/inline-playback-bar.tsx src/components/listening/inline-playback-bar.test.tsx
git commit -m "feat(listening): InlinePlaybackBar — replaces PlayAllButton, no sentence-boundary flicker"
```

---

### Task 4: Update PlaybackTimeline — inlineBarVisible gate + buffered region + seek blocking

**Files:**
- Modify: `src/components/listening/playback-timeline.tsx`

- [ ] **Step 1: Replace `playback-timeline.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { cn } from "@/lib/utils";
import type { Sentence } from "@/lib/lessons/types";

function fmtMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PlaybackTimeline({ sentences }: { sentences: Sentence[] }) {
  const mode = useListeningAudioStore((s) => s.mode);
  const status = useListeningAudioStore((s) => s.status);
  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const audioEl = useListeningAudioStore((s) => s.audioEl);
  const readySet = useListeningAudioStore((s) => s.readySet);
  const inlineBarVisible = useListeningAudioStore((s) => s.inlineBarVisible);
  const pause = useListeningAudioStore((s) => s.pause);
  const resume = useListeningAudioStore((s) => s.resume);
  const seekToGlobalMs = useListeningAudioStore((s) => s.seekToGlobalMs);

  const [currentMs, setCurrentMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMs, setDragMs] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  const offsets = useMemo(() => {
    const result: number[] = [];
    let acc = 0;
    for (const s of sentences) {
      result.push(acc);
      acc += s.durationMs ?? 0;
    }
    return result;
  }, [sentences]);

  const totalMs = useMemo(
    () => sentences.reduce((acc, s) => acc + (s.durationMs ?? 0), 0),
    [sentences],
  );

  // Contiguous buffered duration starting from sentence 0.
  const bufferedMs = useMemo(() => {
    let ms = 0;
    for (let i = 0; i < sentences.length; i++) {
      if (!readySet.has(i)) break;
      ms += sentences[i].durationMs ?? 0;
    }
    return ms;
  }, [sentences, readySet]);

  useEffect(() => {
    if (status === "idle") {
      setCurrentMs(0);
      return;
    }
    function tick() {
      if (audioEl && currentIndex >= 0) {
        setCurrentMs((offsets[currentIndex] ?? 0) + audioEl.currentTime * 1000);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [status, audioEl, currentIndex, offsets]);

  function msFromPointer(clientX: number): number {
    const track = trackRef.current;
    if (!track || totalMs === 0) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * totalMs;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragMs(msFromPointer(e.clientX));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setDragMs(msFromPointer(e.clientX));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const ms = msFromPointer(e.clientX);
    setIsDragging(false);
    if (ms > bufferedMs) return; // Block seek to unbuffered region.
    seekToGlobalMs(ms);
  }

  const displayMs = isDragging ? dragMs : currentMs;
  const progressPct = totalMs > 0 ? Math.min(100, (displayMs / totalMs) * 100) : 0;
  const bufferedPct = totalMs > 0 ? Math.min(100, (bufferedMs / totalMs) * 100) : 0;

  // Only render when playback is active AND the inline bar has scrolled out of view.
  if (mode !== "playAll" || status === "idle" || totalMs === 0 || inlineBarVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
      <button
        type="button"
        onClick={status === "paused" ? resume : pause}
        aria-label={status === "paused" ? "Resume" : "Pause"}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:opacity-90 active:scale-95"
      >
        {status === "paused" ? (
          <Play className="size-4 translate-x-px" aria-hidden="true" />
        ) : (
          <Pause className="size-4" aria-hidden="true" />
        )}
      </button>

      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={totalMs}
        aria-valuenow={Math.round(displayMs)}
        aria-label="Playback position"
        tabIndex={0}
        className="relative flex h-8 flex-1 cursor-pointer touch-none select-none items-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(e) => {
          const step = totalMs * 0.02;
          if (e.key === "ArrowRight")
            seekToGlobalMs(Math.min(bufferedMs, currentMs + step));
          if (e.key === "ArrowLeft")
            seekToGlobalMs(Math.max(0, currentMs - step));
        }}
      >
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary/20"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full bg-primary",
              !isDragging && "transition-[width] duration-100 ease-linear",
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow"
          style={{ left: `${progressPct}%` }}
        />
      </div>

      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
        {fmtMs(displayMs)} / {fmtMs(totalMs)}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/listening/playback-timeline.tsx
git commit -m "feat(timeline): gate on inlineBarVisible; buffered region tint; block seek beyond buffer"
```

---

### Task 5: Wire Transcript + delete PlayAllButton

**Files:**
- Modify: `src/components/listening/transcript.tsx`
- Delete: `src/components/listening/play-all-button.tsx`

- [ ] **Step 1: Replace `transcript.tsx`**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Headphones } from "lucide-react";
import { SentenceRow } from "./sentence-row";
import { InlinePlaybackBar } from "./inline-playback-bar";
import type { ListeningLesson } from "@/lib/lessons/types";

export function Transcript({
  lesson,
  showAnnotations,
  showTranslation,
}: {
  lesson: ListeningLesson;
  showAnnotations: boolean;
  showTranslation: boolean;
}) {
  const [shown, setShown] = useState(false);
  const showSpeaker = lesson.format === "dialogue";
  const translationLines = lesson.translationVi.split(/\n+/);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <InlinePlaybackBar
          lessonId={lesson.id}
          cdnBase={lesson.audio.cdnBase}
          manifestVersion={lesson.audio.manifestVersion}
          sentences={lesson.sentences}
          totalDurationMs={lesson.totalDurationMs}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {shown ? (
            <>
              <ChevronUp className="size-3" /> Hide transcript
            </>
          ) : (
            <>
              <ChevronDown className="size-3" /> Show transcript
            </>
          )}
        </button>
      </div>

      {!shown ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <Headphones className="size-4" /> Listen first, then reveal the transcript.
        </div>
      ) : (
        <div className={showTranslation ? "grid grid-cols-1 gap-3 lg:grid-cols-2" : ""}>
          <article className="space-y-0 text-sm leading-relaxed">
            {lesson.sentences.map((s, i) => (
              <SentenceRow
                key={s.id}
                index={i}
                sentence={s}
                annotations={lesson.annotations}
                showAnnotations={showAnnotations}
                showSpeaker={showSpeaker}
                lessonId={lesson.id}
                cdnBase={lesson.audio.cdnBase}
                manifestVersion={lesson.audio.manifestVersion}
                allSentences={lesson.sentences}
              />
            ))}
          </article>
          {showTranslation && (
            <aside className="space-y-2 rounded-md bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
              {translationLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Delete `play-all-button.tsx`**

```bash
rm src/components/listening/play-all-button.tsx
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass, no references to `play-all-button` remain.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/listening/transcript.tsx
git rm src/components/listening/play-all-button.tsx
git commit -m "feat(transcript): swap PlayAllButton for InlinePlaybackBar; delete play-all-button.tsx"
```
