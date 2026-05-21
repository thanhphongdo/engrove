import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "./client";
import type { WritingAttempt, WritingDraft } from "./types";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("writing tables (DB v5)", () => {
  it("round-trips a writing draft", async () => {
    const draft: WritingDraft = {
      profileId: "default",
      lessonId: "writing-a1-001",
      text: "I usually relax.",
      mcPicks: { q1: 1 },
      sampleRevealed: false,
      updatedAt: Date.now(),
      durationMs: 12_000,
    };
    await db.writingDrafts.put(draft);
    const loaded = await db.writingDrafts.get(["default", "writing-a1-001"]);
    expect(loaded?.text).toBe("I usually relax.");
  });

  it("lists writing attempts by [profileId+lessonId]", async () => {
    const attempt: WritingAttempt = {
      id: "att-1",
      profileId: "default",
      lessonId: "writing-a1-001",
      startedAt: 0,
      completedAt: 1,
      durationMs: 1,
      text: "Hello.",
      mcScore: 0,
      mcTotal: 0,
      mcPicks: {},
      llmResult: null,
      sampleRevealed: false,
    };
    await db.writingAttempts.put(attempt);
    const rows = await db.writingAttempts
      .where("[profileId+lessonId]")
      .equals(["default", "writing-a1-001"])
      .toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("att-1");
  });
});
