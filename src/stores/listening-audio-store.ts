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

  playSingle: (lessonId: string, cdnBase: string, sentences: Sentence[], index: number, manifestVersion?: number) => void;
  playAll: (lessonId: string, cdnBase: string, sentences: Sentence[], fromIndex?: number, manifestVersion?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  advanceOnEnded: () => void;
  setStatus: (status: AudioStatus) => void;
};

export const useListeningAudioStore = create<State>((set, get) => ({
  lessonId: null,
  cdnBase: null,
  sentences: [],
  currentIndex: -1,
  status: "idle",
  mode: null,
  manifestVersion: 1,

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
    });
  },

  advanceOnEnded() {
    const s = get();
    if (s.mode === "playAll" && s.currentIndex < s.sentences.length - 1) {
      set({ currentIndex: s.currentIndex + 1, status: "loading" });
    } else {
      get().stop();
    }
  },

  setStatus(status) {
    set({ status });
  },
}));
