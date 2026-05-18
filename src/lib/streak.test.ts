import { describe, it, expect } from "vitest";
import { computeStreak } from "./streak";
import type { Attempt } from "./db/types";

/** Build a minimal Attempt at a specific local date (noon to avoid TZ edge cases). */
function attemptAt(year: number, month: number, day: number): Attempt {
  const ts = new Date(year, month - 1, day, 12).getTime();
  return {
    id: `att-${ts}`,
    profileId: "default",
    lessonId: "reading-a1-001",
    startedAt: ts,
    completedAt: ts,
    durationMs: 1000,
    score: 1,
    total: 1,
    mcScore: 1,
    mcTotal: 1,
    clozeScore: 0,
    clozeTotal: 0,
    answers: [],
  };
}

function nowAt(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day, 12).getTime();
}

describe("computeStreak", () => {
  it("returns zeros for an empty input", () => {
    expect(computeStreak([])).toEqual({
      current: 0,
      longest: 0,
      lastActiveDate: null,
    });
  });

  it("counts a single attempt today as 1-day streak", () => {
    const now = nowAt(2026, 5, 18);
    const result = computeStreak([attemptAt(2026, 5, 18)], now);
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
    expect(result.lastActiveDate).toBe("2026-05-18");
  });

  it("counts an attempt only yesterday as 1-day streak (grace day)", () => {
    const now = nowAt(2026, 5, 18);
    const result = computeStreak([attemptAt(2026, 5, 17)], now);
    expect(result.current).toBe(1);
  });

  it("resets when the most recent study day was two days ago", () => {
    const now = nowAt(2026, 5, 18);
    const result = computeStreak([attemptAt(2026, 5, 16)], now);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(1);
  });

  it("counts consecutive days as one streak", () => {
    const now = nowAt(2026, 5, 18);
    const attempts = [
      attemptAt(2026, 5, 16),
      attemptAt(2026, 5, 17),
      attemptAt(2026, 5, 18),
    ];
    const result = computeStreak(attempts, now);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it("multiple attempts on the same day count once", () => {
    const now = nowAt(2026, 5, 18);
    const attempts = [
      attemptAt(2026, 5, 18),
      attemptAt(2026, 5, 18),
      attemptAt(2026, 5, 18),
    ];
    const result = computeStreak(attempts, now);
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
  });

  it("tracks longest run even after a gap breaks the current streak", () => {
    const now = nowAt(2026, 5, 18);
    const attempts = [
      // 4-day run, then a gap, then a 1-day run today
      attemptAt(2026, 5, 1),
      attemptAt(2026, 5, 2),
      attemptAt(2026, 5, 3),
      attemptAt(2026, 5, 4),
      attemptAt(2026, 5, 18),
    ];
    const result = computeStreak(attempts, now);
    expect(result.current).toBe(1);
    expect(result.longest).toBe(4);
  });

  it("handles month boundaries", () => {
    const now = nowAt(2026, 6, 1);
    const attempts = [
      attemptAt(2026, 5, 30),
      attemptAt(2026, 5, 31),
      attemptAt(2026, 6, 1),
    ];
    const result = computeStreak(attempts, now);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });
});
