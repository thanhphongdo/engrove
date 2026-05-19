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
