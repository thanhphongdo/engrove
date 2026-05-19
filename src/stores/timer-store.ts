import { create } from "zustand";

export type TimerStatus = "stopped" | "running" | "paused";

type TimerState = {
  status: TimerStatus;
  anchor: number | null;
  accumulatedMs: number;
  /** Fresh attempt: zero the clock and start counting. */
  begin: (now?: number) => void;
  /** Halt counting; preserves elapsed time. */
  pause: (now?: number) => void;
  /** Continue from paused; elapsed time picks up where it left off. */
  resume: (now?: number) => void;
  /** End the attempt; elapsed time is preserved. Next begin() will reset. */
  finish: (now?: number) => void;
  /** Hard reset to a fresh stopped state. */
  reset: () => void;
  /** Restore a saved duration; treated as paused so the user can resume. */
  hydrate: (durationMs: number) => void;
  elapsedAt: (now: number) => number;
};

export const useTimerStore = create<TimerState>((set, get) => ({
  status: "stopped",
  anchor: null,
  accumulatedMs: 0,
  begin: (now = Date.now()) => {
    set({ status: "running", anchor: now, accumulatedMs: 0 });
  },
  pause: (now = Date.now()) => {
    const s = get();
    if (s.status !== "running" || s.anchor === null) return;
    set({
      status: "paused",
      anchor: null,
      accumulatedMs: s.accumulatedMs + (now - s.anchor),
    });
  },
  resume: (now = Date.now()) => {
    const s = get();
    if (s.status !== "paused") return;
    set({ status: "running", anchor: now });
  },
  finish: (now = Date.now()) => {
    const s = get();
    if (s.status === "stopped") return;
    const accumulated =
      s.status === "running" && s.anchor !== null
        ? s.accumulatedMs + (now - s.anchor)
        : s.accumulatedMs;
    set({ status: "stopped", anchor: null, accumulatedMs: accumulated });
  },
  reset: () => set({ status: "stopped", anchor: null, accumulatedMs: 0 }),
  hydrate: (durationMs) =>
    set({ status: "paused", anchor: null, accumulatedMs: durationMs }),
  elapsedAt: (now) => {
    const s = get();
    return (
      s.accumulatedMs +
      (s.status === "running" && s.anchor !== null ? now - s.anchor : 0)
    );
  },
}));
