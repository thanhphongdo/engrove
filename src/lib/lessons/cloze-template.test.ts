import { describe, it, expect } from "vitest";
import { parseTemplate, extractPlaceholderIds } from "./cloze-template";
import type { ClozeBlank, ClozeQuiz } from "./types";

const B = (id: string): ClozeBlank => ({
  id,
  options: ["a", "b", "c", "d"],
  answerIndex: 0,
  explanation: "",
});

describe("extractPlaceholderIds", () => {
  it("returns ids in order", () => {
    expect(extractPlaceholderIds("I {{b1}} to {{b2}}.")).toEqual(["b1", "b2"]);
  });

  it("trims whitespace inside placeholders", () => {
    expect(extractPlaceholderIds("X {{ b1 }} Y")).toEqual(["b1"]);
  });

  it("returns empty list for templates without placeholders", () => {
    expect(extractPlaceholderIds("plain text")).toEqual([]);
  });
});

describe("parseTemplate", () => {
  it("splits a single-blank template into text/blank/text", () => {
    const cloze: ClozeQuiz = { template: "I {{b1}} home.", blanks: [B("b1")] };
    const segs = parseTemplate(cloze);
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ kind: "text", text: "I " });
    expect(segs[1].kind).toBe("blank");
    expect(segs[2]).toEqual({ kind: "text", text: " home." });
  });

  it("handles multiple blanks", () => {
    const cloze: ClozeQuiz = {
      template: "{{b1}} and {{b2}} are friends.",
      blanks: [B("b1"), B("b2")],
    };
    const segs = parseTemplate(cloze);
    expect(segs.filter((s) => s.kind === "blank")).toHaveLength(2);
  });

  it("returns single text segment when no placeholders", () => {
    const cloze: ClozeQuiz = { template: "plain text", blanks: [] };
    expect(parseTemplate(cloze)).toEqual([{ kind: "text", text: "plain text" }]);
  });

  it("throws when a placeholder has no matching blank", () => {
    const cloze: ClozeQuiz = { template: "I {{missing}} home.", blanks: [B("b1")] };
    expect(() => parseTemplate(cloze)).toThrow(/missing/);
  });

  it("throws when a blank is not referenced by the template", () => {
    const cloze: ClozeQuiz = { template: "I {{b1}} home.", blanks: [B("b1"), B("b2")] };
    expect(() => parseTemplate(cloze)).toThrow(/b2/);
  });

  it("throws when a placeholder appears more than once", () => {
    const cloze: ClozeQuiz = { template: "{{b1}} or {{b1}}", blanks: [B("b1")] };
    expect(() => parseTemplate(cloze)).toThrow(/Duplicate/);
  });

  it("throws when two blanks share an id", () => {
    const cloze: ClozeQuiz = { template: "{{b1}}", blanks: [B("b1"), B("b1")] };
    expect(() => parseTemplate(cloze)).toThrow(/Duplicate cloze blank/);
  });
});
