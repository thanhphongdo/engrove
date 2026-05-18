import { create } from "zustand";

type TimerState = {
  running: boolean;
  anchor: number | null;
  accumulatedMs: number;
  start: (now?: number) => void;
  stop: (now?: number) => void;
  reset: () => void;
  hydrate: (durationMs: number) => void;
  elapsedAt: (now: number) => number;
};

export const useTimerStore = create<TimerState>((set, get) => ({
  running: false,
  anchor: null,
  accumulatedMs: 0,
  start: (now = Date.now()) => {
    if (get().running) return;
    set({ running: true, anchor: now });
  },
  stop: (now = Date.now()) => {
    const s = get();
    if (!s.running || s.anchor === null) return;
    set({
      running: false,
      anchor: null,
      accumulatedMs: s.accumulatedMs + (now - s.anchor),
    });
  },
  reset: () => set({ running: false, anchor: null, accumulatedMs: 0 }),
  hydrate: (durationMs) => set({ running: false, anchor: null, accumulatedMs: durationMs }),
  elapsedAt: (now) => {
    const s = get();
    return s.accumulatedMs + (s.running && s.anchor !== null ? now - s.anchor : 0);
  },
}));
