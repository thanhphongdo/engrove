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
    expect(prefs?.hintToggles.vocabVi).toBe(true);
    expect(prefs?.detailLayout).toBe("stacked");
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
    expect(prefs?.hintToggles.grammar).toBe(true);
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
      score: 13,
      total: 15,
      mcScore: 9,
      mcTotal: 10,
      clozeScore: 4,
      clozeTotal: 5,
      answers: [],
    });
    const list = await listAttemptsForLesson("default", "reading-a1-001");
    expect(list).toHaveLength(1);
    expect(list[0].score).toBe(13);
    expect(list[0].mcScore).toBe(9);
    expect(list[0].clozeScore).toBe(4);
  });

  it("supports attempts without cloze (mcScore = score, clozeScore = 0)", async () => {
    await ensureDefaultProfile();
    await saveAttempt({
      id: "att-2",
      profileId: "default",
      lessonId: "reading-a2-001",
      startedAt: 1000,
      completedAt: 2000,
      durationMs: 800,
      score: 9,
      total: 10,
      mcScore: 9,
      mcTotal: 10,
      clozeScore: 0,
      clozeTotal: 0,
      answers: [],
    });
    const list = await listAttemptsForLesson("default", "reading-a2-001");
    expect(list[0].clozeTotal).toBe(0);
    expect(list[0].clozeAnswers).toBeUndefined();
  });
});

describe("drafts", () => {
  const draftBase = {
    profileId: "default",
    lessonId: "reading-a1-001",
    clozePicks: {} as Record<string, number>,
  };

  it("upserts and retrieves a draft", async () => {
    await ensureDefaultProfile();
    await upsertDraft({
      ...draftBase,
      answers: { q1: 0 },
      durationMs: 5000,
      updatedAt: 1000,
    });
    const draft = await getDraft("default", "reading-a1-001");
    expect(draft?.answers.q1).toBe(0);
    expect(draft?.durationMs).toBe(5000);
    expect(draft?.clozePicks).toEqual({});
  });

  it("persists cloze picks alongside mc picks", async () => {
    await ensureDefaultProfile();
    await upsertDraft({
      ...draftBase,
      answers: { q1: 0 },
      clozePicks: { b1: 2, b2: 0 },
      durationMs: 3000,
      updatedAt: 1000,
    });
    const draft = await getDraft("default", "reading-a1-001");
    expect(draft?.clozePicks).toEqual({ b1: 2, b2: 0 });
  });

  it("overwrites an existing draft", async () => {
    await ensureDefaultProfile();
    await upsertDraft({ ...draftBase, answers: { q1: 0 }, durationMs: 1000, updatedAt: 1000 });
    await upsertDraft({ ...draftBase, answers: { q1: 0, q2: 2 }, durationMs: 5000, updatedAt: 2000 });
    const draft = await getDraft("default", "reading-a1-001");
    expect(draft?.durationMs).toBe(5000);
    expect(draft?.answers.q2).toBe(2);
  });

  it("deletes a draft", async () => {
    await ensureDefaultProfile();
    await upsertDraft({ ...draftBase, answers: { q1: 0 }, durationMs: 100, updatedAt: 0 });
    await deleteDraft("default", "reading-a1-001");
    const draft = await getDraft("default", "reading-a1-001");
    expect(draft).toBeUndefined();
  });
});
