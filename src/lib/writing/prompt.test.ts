import { describe, it, expect } from "vitest";
import { buildLLMPrompt, buildPasteBackPrompt } from "./prompt";

const lesson = {
  level: "A1" as const,
  topic: "My favorite weekend",
  prompt: "Write 5–7 sentences about weekends.",
};

describe("buildLLMPrompt", () => {
  it("embeds level, topic, task, user text, and callback URL", () => {
    const out = buildLLMPrompt({
      lesson,
      userText: "I relax on weekends.",
      callbackUrl: "https://x.app/api/writing/result/abc123",
    });
    expect(out).toContain("A1");
    expect(out).toContain("My favorite weekend");
    expect(out).toContain("Write 5–7 sentences about weekends.");
    expect(out).toContain("I relax on weekends.");
    expect(out).toContain("https://x.app/api/writing/result/abc123");
    expect(out).toContain("POST");
  });

  it("does not duplicate the user text", () => {
    const out = buildLLMPrompt({
      lesson,
      userText: "UNIQUE_MARKER_TEXT",
      callbackUrl: "https://x.app/api/writing/result/abc",
    });
    const matches = out.match(/UNIQUE_MARKER_TEXT/g) ?? [];
    expect(matches).toHaveLength(1);
  });
});

describe("buildPasteBackPrompt", () => {
  it("tells the LLM to print JSON instead of POSTing", () => {
    const out = buildPasteBackPrompt({
      lesson,
      userText: "I relax.",
    });
    expect(out.toLowerCase()).toContain("json");
    expect(out).not.toContain("POST");
  });
});
