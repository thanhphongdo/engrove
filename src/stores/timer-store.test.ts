import { describe, it, expect, beforeEach } from "vitest";
import { useTimerStore } from "./timer-store";

beforeEach(() => {
  useTimerStore.getState().reset();
});

describe("timer store", () => {
  it("accumulates time across start/stop intervals", () => {
    const store = useTimerStore.getState();
    store.start(1000);
    store.stop(3500);
    expect(useTimerStore.getState().accumulatedMs).toBe(2500);
    store.start(4000);
    store.stop(5500);
    expect(useTimerStore.getState().accumulatedMs).toBe(4000);
  });

  it("derives current display while running", () => {
    const store = useTimerStore.getState();
    store.start(1000);
    expect(useTimerStore.getState().elapsedAt(2500)).toBe(1500);
  });

  it("stop() while not running is a no-op", () => {
    const store = useTimerStore.getState();
    store.stop(1000);
    expect(useTimerStore.getState().accumulatedMs).toBe(0);
    expect(useTimerStore.getState().running).toBe(false);
  });

  it("hydrate() seeds accumulatedMs in stopped state", () => {
    const store = useTimerStore.getState();
    store.hydrate(7000);
    expect(useTimerStore.getState().accumulatedMs).toBe(7000);
    expect(useTimerStore.getState().running).toBe(false);
  });
});
