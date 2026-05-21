import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "./client";
import {
  bestWritingAttemptByLesson,
  deleteWritingDraft,
  getWritingDraft,
  listWritingAttemptsForLesson,
  resetWritingProgress,
  saveWritingAttempt,
  upsertWritingDraft,
} from "./queries";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("writing queries", () => {
  it("upserts and reads a writing draft", async () => {
    await upsertWritingDraft({
      profileId: "default",
      lessonId: "writing-a1-001",
      text: "hi",
      mcPicks: {},
      sampleRevealed: false,
      updatedAt: 1,
      durationMs: 0,
    });
    const d = await getWritingDraft("default", "writing-a1-001");
    expect(d?.text).toBe("hi");
  });

  it("deletes a writing draft", async () => {
    await upsertWritingDraft({
      profileId: "default",
      lessonId: "writing-a1-001",
      text: "hi",
      mcPicks: {},
      sampleRevealed: false,
      updatedAt: 1,
      durationMs: 0,
    });
    await deleteWritingDraft("default", "writing-a1-001");
    expect(await getWritingDraft("default", "writing-a1-001")).toBeUndefined();
  });

  it("lists and bests writing attempts by overall score", async () => {
    const base = {
      profileId: "default",
      lessonId: "writing-a1-001",
      startedAt: 0,
      completedAt: 1,
      durationMs: 0,
      text: "t",
      mcScore: 0,
      mcTotal: 0,
      mcPicks: {},
      sampleRevealed: false,
    };
    await saveWritingAttempt({
      ...base,
      id: "a",
      llmResult: { scores: { task: 5, grammar: 5, vocabulary: 5, coherence: 5, overall: 5 }, corrections: [], suggestions: [], rewritten: "" },
    });
    await saveWritingAttempt({
      ...base,
      id: "b",
      llmResult: { scores: { task: 7, grammar: 7, vocabulary: 7, coherence: 7, overall: 7 }, corrections: [], suggestions: [], rewritten: "" },
    });
    const rows = await listWritingAttemptsForLesson("default", "writing-a1-001");
    expect(rows).toHaveLength(2);
    const best = await bestWritingAttemptByLesson("default");
    expect(best.get("writing-a1-001")?.id).toBe("b");
  });

  it("resets writing progress", async () => {
    await upsertWritingDraft({
      profileId: "default",
      lessonId: "writing-a1-001",
      text: "hi",
      mcPicks: {},
      sampleRevealed: false,
      updatedAt: 1,
      durationMs: 0,
    });
    await saveWritingAttempt({
      id: "a",
      profileId: "default",
      lessonId: "writing-a1-001",
      startedAt: 0,
      completedAt: 1,
      durationMs: 0,
      text: "t",
      mcScore: 0,
      mcTotal: 0,
      mcPicks: {},
      llmResult: null,
      sampleRevealed: false,
    });
    await resetWritingProgress("default", "writing-a1-001");
    expect(await getWritingDraft("default", "writing-a1-001")).toBeUndefined();
    expect(await listWritingAttemptsForLesson("default", "writing-a1-001")).toHaveLength(0);
  });
});
