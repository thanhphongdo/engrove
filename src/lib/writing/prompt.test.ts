import { describe, it, expect } from "vitest";
import { buildPasteBackPrompt } from "./prompt";

const lesson = {
  level: "A1" as const,
  topic: "My favorite weekend",
  prompt: "Write 5–7 sentences about weekends.",
};

describe("buildPasteBackPrompt", () => {
  it("embeds level, topic, task, and user text; asks for JSON, not POST", () => {
    const out = buildPasteBackPrompt({
      lesson,
      userText: "I relax on weekends.",
    });
    expect(out).toContain("A1");
    expect(out).toContain("My favorite weekend");
    expect(out).toContain("Write 5–7 sentences about weekends.");
    expect(out).toContain("I relax on weekends.");
    expect(out.toLowerCase()).toContain("json");
    expect(out).not.toContain("POST");
  });

  it("does not duplicate the user text", () => {
    const out = buildPasteBackPrompt({
      lesson,
      userText: "UNIQUE_MARKER_TEXT",
    });
    const matches = out.match(/UNIQUE_MARKER_TEXT/g) ?? [];
    expect(matches).toHaveLength(1);
  });
});
