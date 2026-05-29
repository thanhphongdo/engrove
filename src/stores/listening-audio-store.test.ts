import { describe, it, expect, beforeEach } from "vitest";
import { useListeningAudioStore } from "./listening-audio-store";

const sentences = [
  { id: "s1", speaker: "Narrator", text: "First." },
  { id: "s2", speaker: "Narrator", text: "Second." },
  { id: "s3", speaker: "Narrator", text: "Third." },
];

describe("useListeningAudioStore", () => {
  beforeEach(() => {
    useListeningAudioStore.getState().stop();
  });

  it("starts idle", () => {
    const s = useListeningAudioStore.getState();
    expect(s.status).toBe("idle");
    expect(s.currentIndex).toBe(-1);
    expect(s.mode).toBeNull();
  });

  it("playSingle sets mode=single and currentIndex to the given index", () => {
    useListeningAudioStore.getState().playSingle("listening-a1-001", "https://cdn/x", sentences, 1);
    const s = useListeningAudioStore.getState();
    expect(s.mode).toBe("single");
    expect(s.currentIndex).toBe(1);
    expect(s.status).toBe("loading");
    expect(s.lessonId).toBe("listening-a1-001");
  });

  it("playAll starts at index 0 from idle", () => {
    useListeningAudioStore.getState().playAll("listening-a1-001", "https://cdn/x", sentences);
    expect(useListeningAudioStore.getState().currentIndex).toBe(0);
    expect(useListeningAudioStore.getState().mode).toBe("playAll");
  });

  it("playAll resumes from currentIndex when paused", () => {
    useListeningAudioStore.getState().playAll("listening-a1-001", "https://cdn/x", sentences);
    useListeningAudioStore.setState({ currentIndex: 2, status: "paused" });
    useListeningAudioStore.getState().playAll("listening-a1-001", "https://cdn/x", sentences);
    expect(useListeningAudioStore.getState().currentIndex).toBe(2);
  });

  it("advanceOnEnded stops at end in playAll", () => {
    useListeningAudioStore.getState().playAll("listening-a1-001", "https://cdn/x", sentences);
    useListeningAudioStore.setState({ currentIndex: 2, status: "playing" });
    useListeningAudioStore.getState().advanceOnEnded();
    expect(useListeningAudioStore.getState().status).toBe("idle");
    expect(useListeningAudioStore.getState().currentIndex).toBe(-1);
  });

  it("advanceOnEnded stops playAll — the concat track plays as one continuous file", () => {
    useListeningAudioStore.getState().playAll("listening-a1-001", "https://cdn/x", sentences);
    useListeningAudioStore.setState({ currentIndex: 0, status: "playing" });
    useListeningAudioStore.getState().advanceOnEnded();
    expect(useListeningAudioStore.getState().status).toBe("idle");
    expect(useListeningAudioStore.getState().currentIndex).toBe(-1);
  });

  it("setCurrentIndex updates the highlighted sentence without touching status", () => {
    useListeningAudioStore.getState().playAll("listening-a1-001", "https://cdn/x", sentences);
    useListeningAudioStore.setState({ status: "playing" });
    useListeningAudioStore.getState().setCurrentIndex(2);
    expect(useListeningAudioStore.getState().currentIndex).toBe(2);
    expect(useListeningAudioStore.getState().status).toBe("playing");
  });

  it("advanceOnEnded stops after one sentence in single mode", () => {
    useListeningAudioStore.getState().playSingle("listening-a1-001", "https://cdn/x", sentences, 1);
    useListeningAudioStore.setState({ status: "playing" });
    useListeningAudioStore.getState().advanceOnEnded();
    expect(useListeningAudioStore.getState().status).toBe("idle");
    expect(useListeningAudioStore.getState().currentIndex).toBe(-1);
  });

  it("stop resets to idle and clears the lesson", () => {
    useListeningAudioStore.getState().playSingle("listening-a1-001", "https://cdn/x", sentences, 1);
    useListeningAudioStore.getState().stop();
    const s = useListeningAudioStore.getState();
    expect(s.status).toBe("idle");
    expect(s.currentIndex).toBe(-1);
    expect(s.lessonId).toBeNull();
  });
});

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
