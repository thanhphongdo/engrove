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
  pendingSeekMs: number | null; // non-null = seek to this offset (ms) within currentIndex after load

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

  load(lessonId, cdnBase, sentences, manifestVersion = 1) {
    // Populate audio metadata without starting playback so TranscriptPlayer
    // can begin preloading as soon as the detail page mounts.
    if (get().lessonId === lessonId) return; // already loaded (may be playing)
    set({ lessonId, cdnBase, sentences, manifestVersion });
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
}));
