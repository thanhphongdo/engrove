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

  // Gapless "Play all" track (one concatenated file). Set once it's built.
  concatUrl: string | null;
  concatOffsetsMs: number[];
  concatTotalMs: number;
  /** When set, playback auto-pauses once it reaches this ms (used to preview one sentence/turn). */
  playUntilMs: number | null;

  load: (lessonId: string, cdnBase: string, sentences: Sentence[], manifestVersion?: number) => void;
  playSingle: (lessonId: string, cdnBase: string, sentences: Sentence[], index: number, manifestVersion?: number) => void;
  playAll: (lessonId: string, cdnBase: string, sentences: Sentence[], fromIndex?: number, manifestVersion?: number) => void;
  /** Play a slice of the Play-all track [startMs, untilMs) — previews one sentence using the shared track. */
  playFrom: (lessonId: string, cdnBase: string, sentences: Sentence[], startMs: number, untilMs: number | null, manifestVersion?: number) => void;
  /** Position the Play-all track at startMs (paused) without playing — the scrubber reflects it while audio is played elsewhere. */
  cueTo: (lessonId: string, cdnBase: string, sentences: Sentence[], startMs: number, manifestVersion?: number) => void;
  clearPlayUntil: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  advanceOnEnded: () => void;
  setStatus: (status: AudioStatus) => void;
  setAudioEl: (el: HTMLAudioElement | null) => void;
  setCurrentIndex: (index: number) => void;
  clearPendingSeek: () => void;
  seekToGlobalMs: (globalMs: number) => void;
  markReady: (index: number) => void;
  clearReady: () => void;
  setInlineBarVisible: (v: boolean) => void;
  setConcat: (lessonId: string, manifestVersion: number, url: string, offsetsMs: number[], totalMs: number) => void;
};

/** Map a global ms position to a sentence index using concat offsets (or durationMs). */
function indexFromMs(offsets: number[], globalMs: number): number {
  let idx = 0;
  for (let i = 0; i < offsets.length; i++) {
    if (offsets[i] <= globalMs) idx = i;
    else break;
  }
  return idx;
}

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
  concatUrl: null,
  concatOffsetsMs: [],
  concatTotalMs: 0,
  playUntilMs: null,

  load(lessonId, cdnBase, sentences, manifestVersion = 1) {
    if (get().lessonId === lessonId) return;
    // New lesson — drop the previous lesson's concat track.
    const prevUrl = get().concatUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    set({
      lessonId,
      cdnBase,
      sentences,
      manifestVersion,
      readySet: new Set(),
      concatUrl: null,
      concatOffsetsMs: [],
      concatTotalMs: 0,
      playUntilMs: null,
    });
  },

  setConcat(lessonId, manifestVersion, url, offsetsMs, totalMs) {
    const s = get();
    // Ignore a build that resolved after the user navigated to another lesson.
    if (s.lessonId !== lessonId || s.manifestVersion !== manifestVersion) {
      URL.revokeObjectURL(url);
      return;
    }
    if (s.concatUrl) URL.revokeObjectURL(s.concatUrl);
    set({ concatUrl: url, concatOffsetsMs: offsetsMs, concatTotalMs: totalMs });
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
    // Resuming a paused track keeps its position; a fresh start (or explicit
    // fromIndex) seeks to that sentence's offset within the concat track.
    const seekToOffset =
      isResumeFromPaused && fromIndex === undefined
        ? null
        : (get().concatOffsetsMs[startIndex] ?? 0);
    set({
      lessonId,
      cdnBase,
      sentences,
      currentIndex: startIndex,
      status: isResumeFromPaused && fromIndex === undefined ? "playing" : "loading",
      mode: "playAll",
      manifestVersion,
      pendingSeekMs: seekToOffset,
      playUntilMs: null,
    });
  },

  playFrom(lessonId, cdnBase, sentences, startMs, untilMs, manifestVersion = 1) {
    if (sentences.length === 0) return;
    set({
      lessonId,
      cdnBase,
      sentences,
      currentIndex: indexFromMs(get().concatOffsetsMs, startMs),
      status: "loading",
      mode: "playAll",
      manifestVersion,
      pendingSeekMs: startMs,
      playUntilMs: untilMs,
    });
  },

  cueTo(lessonId, cdnBase, sentences, startMs, manifestVersion = 1) {
    if (sentences.length === 0) return;
    set({
      lessonId,
      cdnBase,
      sentences,
      currentIndex: indexFromMs(get().concatOffsetsMs, startMs),
      status: "paused",
      mode: "playAll",
      manifestVersion,
      pendingSeekMs: startMs,
      playUntilMs: null,
    });
  },

  clearPlayUntil() {
    if (get().playUntilMs !== null) set({ playUntilMs: null });
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
      playUntilMs: null,
      readySet: new Set(),
    });
  },

  // One continuous track per play session: when audio ends, playback is done.
  advanceOnEnded() {
    get().stop();
  },

  setStatus(status) {
    set({ status });
  },

  setAudioEl(el) {
    set({ audioEl: el });
  },

  setCurrentIndex(index) {
    if (get().currentIndex !== index) set({ currentIndex: index });
  },

  clearPendingSeek() {
    set({ pendingSeekMs: null });
  },

  seekToGlobalMs(globalMs: number) {
    const { sentences, mode, concatOffsetsMs } = get();
    if (!sentences.length) return;
    // Concat "Play all": seek the single track directly; keep playing.
    // A manual scrub cancels any active sentence-preview boundary.
    if (mode === "playAll" && concatOffsetsMs.length) {
      set({
        currentIndex: indexFromMs(concatOffsetsMs, globalMs),
        pendingSeekMs: globalMs,
        playUntilMs: null,
      });
      return;
    }
    // Per-sentence fallback (single mode): pick the sentence + intra-sentence offset.
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
