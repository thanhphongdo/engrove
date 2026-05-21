import { db } from "./client";
import {
  DEFAULT_CONTENT_ZOOM,
  DEFAULT_HINT_TOGGLES,
  MAX_CONTENT_ZOOM,
  MIN_CONTENT_ZOOM,
  type Attempt,
  type Bookmark,
  type DetailLayout,
  type Draft,
  type HintToggles,
  type Note,
  type Preferences,
  type Profile,
  type VocabEntry,
  type WritingAttempt,
  type WritingDraft,
} from "./types";

const DEFAULT_PROFILE_ID = "default";

export async function ensureDefaultProfile(): Promise<void> {
  await db.transaction("rw", db.profiles, db.preferences, async () => {
    const existing = await db.profiles.get(DEFAULT_PROFILE_ID);
    if (existing) return;
    const now = Date.now();
    await db.profiles.put({ id: DEFAULT_PROFILE_ID, name: "Me", createdAt: now });
    await db.preferences.put({
      profileId: DEFAULT_PROFILE_ID,
      hintToggles: { ...DEFAULT_HINT_TOGGLES },
      detailLayout: "two-column",
      activeProfileId: DEFAULT_PROFILE_ID,
      contentZoom: DEFAULT_CONTENT_ZOOM,
    });
  });
}

export async function getActiveProfile(): Promise<Profile | undefined> {
  const prefs = await db.preferences.toCollection().first();
  if (!prefs) return undefined;
  return db.profiles.get(prefs.activeProfileId);
}

export async function getPreferences(profileId: string): Promise<Preferences | undefined> {
  return db.preferences.get(profileId);
}

export async function setHintToggle(
  profileId: string,
  key: keyof HintToggles,
  value: boolean,
): Promise<void> {
  const prefs = await db.preferences.get(profileId);
  if (!prefs) return;
  prefs.hintToggles = { ...prefs.hintToggles, [key]: value };
  await db.preferences.put(prefs);
}

export async function setDetailLayout(
  profileId: string,
  layout: DetailLayout,
): Promise<void> {
  const prefs = await db.preferences.get(profileId);
  if (!prefs) return;
  prefs.detailLayout = layout;
  await db.preferences.put(prefs);
}

export async function setContentZoom(
  profileId: string,
  zoom: number,
): Promise<void> {
  const prefs = await db.preferences.get(profileId);
  if (!prefs) return;
  prefs.contentZoom = Math.max(MIN_CONTENT_ZOOM, Math.min(MAX_CONTENT_ZOOM, zoom));
  await db.preferences.put(prefs);
}

export async function saveAttempt(attempt: Attempt): Promise<void> {
  await db.attempts.put(attempt);
}

export async function listAttemptsForLesson(
  profileId: string,
  lessonId: string,
): Promise<Attempt[]> {
  return db.attempts
    .where("[profileId+lessonId]")
    .equals([profileId, lessonId])
    .sortBy("completedAt");
}

export async function bestAttemptByLesson(
  profileId: string,
): Promise<Map<string, Attempt>> {
  const all = await db.attempts.where({ profileId }).toArray();
  const best = new Map<string, Attempt>();
  for (const a of all) {
    const prev = best.get(a.lessonId);
    if (!prev || a.score > prev.score) best.set(a.lessonId, a);
  }
  return best;
}

export async function upsertDraft(draft: Draft): Promise<void> {
  await db.drafts.put(draft);
}

export async function getDraft(
  profileId: string,
  lessonId: string,
): Promise<Draft | undefined> {
  return db.drafts.get([profileId, lessonId]);
}

export async function deleteDraft(
  profileId: string,
  lessonId: string,
): Promise<void> {
  await db.drafts.delete([profileId, lessonId]);
}

export async function resetLessonProgress(
  profileId: string,
  lessonId: string,
): Promise<void> {
  await db.transaction("rw", db.attempts, db.drafts, async () => {
    const keys = await db.attempts
      .where("[profileId+lessonId]")
      .equals([profileId, lessonId])
      .primaryKeys();
    if (keys.length > 0) {
      await db.attempts.bulkDelete(keys as string[]);
    }
    await db.drafts.delete([profileId, lessonId]);
  });
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export async function listBookmarkedLessonIds(profileId: string): Promise<string[]> {
  const rows = await db.bookmarks.where("profileId").equals(profileId).toArray();
  return rows.map((r) => r.lessonId);
}

export async function isBookmarked(profileId: string, lessonId: string): Promise<boolean> {
  return (await db.bookmarks.get([profileId, lessonId])) != null;
}

export async function toggleBookmark(profileId: string, lessonId: string): Promise<boolean> {
  const existing = await db.bookmarks.get([profileId, lessonId]);
  if (existing) {
    await db.bookmarks.delete([profileId, lessonId]);
    return false;
  }
  const row: Bookmark = { profileId, lessonId, createdAt: Date.now() };
  await db.bookmarks.put(row);
  return true;
}

// ─── Vocab ────────────────────────────────────────────────────────────────────

export type SaveVocabInput = {
  phrase: string;
  meaningVi: string;
  pronunciation?: string;
  exampleEn?: string;
  sourceLessonId: string;
};

export async function saveVocab(
  profileId: string,
  input: SaveVocabInput,
): Promise<{ saved: boolean; reason?: "duplicate" }> {
  const phraseLower = input.phrase.trim().toLowerCase();
  const dup = await db.vocab
    .where("[profileId+phraseLower]")
    .equals([profileId, phraseLower])
    .first();
  if (dup) return { saved: false, reason: "duplicate" };

  const entry: VocabEntry = {
    id: crypto.randomUUID(),
    profileId,
    phrase: input.phrase,
    phraseLower,
    meaningVi: input.meaningVi,
    pronunciation: input.pronunciation,
    exampleEn: input.exampleEn,
    sourceLessonId: input.sourceLessonId,
    addedAt: Date.now(),
  };
  await db.vocab.put(entry);
  return { saved: true };
}

/** Re-insert a previously-deleted entry exactly as it was (for undo). */
export async function restoreVocab(entry: VocabEntry): Promise<void> {
  await db.vocab.put(entry);
}

export async function listVocab(profileId: string): Promise<VocabEntry[]> {
  return db.vocab.where("[profileId+addedAt]").between([profileId, -Infinity], [profileId, Infinity]).toArray();
}

export async function deleteVocab(id: string): Promise<VocabEntry | undefined> {
  const row = await db.vocab.get(id);
  if (!row) return undefined;
  await db.vocab.delete(id);
  return row;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function getNote(
  profileId: string,
  lessonId: string,
): Promise<Note | undefined> {
  return db.notes.get([profileId, lessonId]);
}

export async function setNote(
  profileId: string,
  lessonId: string,
  text: string,
): Promise<void> {
  if (text.trim().length === 0) {
    await db.notes.delete([profileId, lessonId]);
    return;
  }
  const row: Note = { profileId, lessonId, text, updatedAt: Date.now() };
  await db.notes.put(row);
}

// ─── Writing drafts & attempts ────────────────────────────────────────────────

export async function upsertWritingDraft(draft: WritingDraft): Promise<void> {
  await db.writingDrafts.put(draft);
}

export async function getWritingDraft(
  profileId: string,
  lessonId: string,
): Promise<WritingDraft | undefined> {
  return db.writingDrafts.get([profileId, lessonId]);
}

export async function deleteWritingDraft(
  profileId: string,
  lessonId: string,
): Promise<void> {
  await db.writingDrafts.delete([profileId, lessonId]);
}

export async function saveWritingAttempt(attempt: WritingAttempt): Promise<void> {
  await db.writingAttempts.put(attempt);
}

export async function listWritingAttemptsForLesson(
  profileId: string,
  lessonId: string,
): Promise<WritingAttempt[]> {
  return db.writingAttempts
    .where("[profileId+lessonId]")
    .equals([profileId, lessonId])
    .sortBy("completedAt");
}

export async function bestWritingAttemptByLesson(
  profileId: string,
): Promise<Map<string, WritingAttempt>> {
  const all = await db.writingAttempts.where({ profileId }).toArray();
  const best = new Map<string, WritingAttempt>();
  for (const a of all) {
    const prev = best.get(a.lessonId);
    const prevOverall = prev?.llmResult?.scores.overall ?? -1;
    const curOverall = a.llmResult?.scores.overall ?? -1;
    if (!prev || curOverall > prevOverall) best.set(a.lessonId, a);
  }
  return best;
}

export async function resetWritingProgress(
  profileId: string,
  lessonId: string,
): Promise<void> {
  await db.transaction(
    "rw",
    db.writingAttempts,
    db.writingDrafts,
    async () => {
      const keys = await db.writingAttempts
        .where("[profileId+lessonId]")
        .equals([profileId, lessonId])
        .primaryKeys();
      if (keys.length > 0) {
        await db.writingAttempts.bulkDelete(keys as string[]);
      }
      await db.writingDrafts.delete([profileId, lessonId]);
    },
  );
}
