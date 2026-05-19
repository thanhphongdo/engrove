import { describe, it, expect, beforeEach } from "vitest";
import { useTimerStore } from "./timer-store";

beforeEach(() => {
  useTimerStore.getState().reset();
});

describe("timer store", () => {
  it("accumulates time across pause/resume intervals", () => {
    const store = useTimerStore.getState();
    store.begin(1000);
    store.pause(3500);
    expect(useTimerStore.getState().accumulatedMs).toBe(2500);
    store.resume(4000);
    store.pause(5500);
    expect(useTimerStore.getState().accumulatedMs).toBe(4000);
  });

  it("derives current display while running", () => {
    const store = useTimerStore.getState();
    store.begin(1000);
    expect(useTimerStore.getState().elapsedAt(2500)).toBe(1500);
  });

  it("pause() while not running is a no-op", () => {
    const store = useTimerStore.getState();
    store.pause(1000);
    expect(useTimerStore.getState().accumulatedMs).toBe(0);
    expect(useTimerStore.getState().status).toBe("stopped");
  });

  it("resume() only works from paused state", () => {
    const store = useTimerStore.getState();
    store.resume(1000);
    expect(useTimerStore.getState().status).toBe("stopped");
    store.begin(1000);
    store.resume(2000);
    expect(useTimerStore.getState().status).toBe("running");
  });

  it("finish() preserves elapsed time and transitions to stopped", () => {
    const store = useTimerStore.getState();
    store.begin(1000);
    store.finish(4000);
    expect(useTimerStore.getState().accumulatedMs).toBe(3000);
    expect(useTimerStore.getState().status).toBe("stopped");
  });

  it("begin() resets accumulated time on a fresh attempt", () => {
    const store = useTimerStore.getState();
    store.begin(1000);
    store.finish(4000);
    expect(useTimerStore.getState().accumulatedMs).toBe(3000);
    store.begin(5000);
    expect(useTimerStore.getState().accumulatedMs).toBe(0);
    expect(useTimerStore.getState().status).toBe("running");
  });

  it("hydrate() seeds accumulatedMs in paused state so user can resume", () => {
    const store = useTimerStore.getState();
    store.hydrate(7000);
    expect(useTimerStore.getState().accumulatedMs).toBe(7000);
    expect(useTimerStore.getState().status).toBe("paused");
    store.resume(8000);
    expect(useTimerStore.getState().elapsedAt(9000)).toBe(8000);
  });
});
