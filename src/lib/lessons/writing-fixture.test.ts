import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { writingLessonSchema, writingLessonsIndexSchema } from "./schema";

describe("writing fixture", () => {
  it("validates writing-a1-001 against the schema", () => {
    const raw = readFileSync(
      resolve(process.cwd(), "public/lessons/writing/a1/writing-a1-001.json"),
      "utf-8",
    );
    expect(() => writingLessonSchema.parse(JSON.parse(raw))).not.toThrow();
  });

  it("validates the writing index", () => {
    const raw = readFileSync(
      resolve(process.cwd(), "public/lessons/writing/index.json"),
      "utf-8",
    );
    expect(() => writingLessonsIndexSchema.parse(JSON.parse(raw))).not.toThrow();
  });
});
