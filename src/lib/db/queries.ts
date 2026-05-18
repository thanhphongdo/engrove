import { db } from "./client";
import {
  DEFAULT_CONTENT_ZOOM,
  DEFAULT_HINT_TOGGLES,
  MAX_CONTENT_ZOOM,
  MIN_CONTENT_ZOOM,
  type Attempt,
  type DetailLayout,
  type Draft,
  type HintToggles,
  type Preferences,
  type Profile,
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
