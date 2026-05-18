import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./client";
import {
  ensureDefaultProfile,
  getActiveProfile,
  getPreferences,
  setHintToggle,
  setDetailLayout,
  saveAttempt,
  listAttemptsForLesson,
  upsertDraft,
  getDraft,
  deleteDraft,
} from "./queries";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("ensureDefaultProfile", () => {
  it("creates the default profile and preferences on first call", async () => {
    await ensureDefaultProfile();
    const profile = await getActiveProfile();
    expect(profile?.id).toBe("default");
    const prefs = await getPreferences("default");
    expect(prefs?.hintToggles.vocabVi).toBe(false);
    expect(prefs?.detailLayout).toBe("two-column");
  });

  it("is idempotent", async () => {
    await ensureDefaultProfile();
    await ensureDefaultProfile();
    const count = await db.profiles.count();
    expect(count).toBe(1);
  });
});

describe("preference setters", () => {
  it("updates a single hint toggle", async () => {
    await ensureDefaultProfile();
    await setHintToggle("default", "vocabVi", true);
    const prefs = await getPreferences("default");
    expect(prefs?.hintToggles.vocabVi).toBe(true);
    expect(prefs?.hintToggles.grammar).toBe(false);
  });

  it("updates detail layout", async () => {
    await ensureDefaultProfile();
    await setDetailLayout("default", "stacked");
    const prefs = await getPreferences("default");
    expect(prefs?.detailLayout).toBe("stacked");
  });
});

describe("attempts", () => {
  it("saves and lists attempts for a lesson", async () => {
    await ensureDefaultProfile();
    await saveAttempt({
      id: "att-1",
      profileId: "default",
      lessonId: "reading-a1-001",
      startedAt: 1000,
      completedAt: 2000,
      durationMs: 800,
      score: 9,
      total: 10,
      answers: [],
    });
    const list = await listAttemptsForLesson("default", "reading-a1-001");
    expect(list).toHaveLength(1);
    expect(list[0].score).toBe(9);
  });
});

describe("drafts", () => {
  it("upserts and retrieves a draft", async () => {
    await ensureDefaultProfile();
    await upsertDraft({
      profileId: "default",
      lessonId: "reading-a1-001",
      answers: { q1: 0 },
      durationMs: 5000,
      updatedAt: 1000,
    });
    const draft = await getDraft("default", "reading-a1-001");
    expect(draft?.answers.q1).toBe(0);
    expect(draft?.durationMs).toBe(5000);
  });

  it("overwrites an existing draft", async () => {
    await ensureDefaultProfile();
    await upsertDraft({ profileId: "default", lessonId: "reading-a1-001", answers: { q1: 0 }, durationMs: 1000, updatedAt: 1000 });
    await upsertDraft({ profileId: "default", lessonId: "reading-a1-001", answers: { q1: 0, q2: 2 }, durationMs: 5000, updatedAt: 2000 });
    const draft = await getDraft("default", "reading-a1-001");
    expect(draft?.durationMs).toBe(5000);
    expect(draft?.answers.q2).toBe(2);
  });

  it("deletes a draft", async () => {
    await ensureDefaultProfile();
    await upsertDraft({ profileId: "default", lessonId: "reading-a1-001", answers: { q1: 0 }, durationMs: 100, updatedAt: 0 });
    await deleteDraft("default", "reading-a1-001");
    const draft = await getDraft("default", "reading-a1-001");
    expect(draft).toBeUndefined();
  });
});
