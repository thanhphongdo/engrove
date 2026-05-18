import { describe, it, expect } from "vitest";
import { splitWithAnnotations } from "./annotate";

const A = (phrase: string, meaningVi: string) => ({ phrase, meaningVi });

describe("splitWithAnnotations", () => {
  it("returns one text segment when there are no annotations", () => {
    expect(splitWithAnnotations("Hello world", [])).toEqual([
      { kind: "text", text: "Hello world" },
    ]);
  });

  it("wraps a single annotation occurrence", () => {
    expect(
      splitWithAnnotations("I took a taxi to the hotel.", [A("taxi", "taxi")]),
    ).toEqual([
      { kind: "text", text: "I took a " },
      { kind: "annotation", text: "taxi", annotation: A("taxi", "taxi") },
      { kind: "text", text: " to the hotel." },
    ]);
  });

  it("wraps every occurrence of the same phrase", () => {
    const result = splitWithAnnotations("taxi or taxi", [A("taxi", "taxi")]);
    expect(result.filter((s) => s.kind === "annotation")).toHaveLength(2);
  });

  it("matches longest annotation first when they overlap", () => {
    const annos = [A("New York", "Nữu Ước"), A("New", "Mới")];
    const result = splitWithAnnotations("I love New York.", annos);
    const annoSegments = result.filter((s) => s.kind === "annotation");
    expect(annoSegments).toHaveLength(1);
    expect(annoSegments[0].text).toBe("New York");
  });

  it("is case-sensitive (exact substring)", () => {
    const result = splitWithAnnotations("Taxi and taxi", [A("taxi", "taxi")]);
    expect(result.filter((s) => s.kind === "annotation")).toHaveLength(1);
  });
});
