import Dexie, { type Table } from "dexie";
import type {
  Profile,
  Preferences,
  Attempt,
  Draft,
  Bookmark,
  VocabEntry,
  Note,
} from "./types";
import { DEFAULT_CONTENT_ZOOM } from "./types";
import type { WritingDraft, WritingAttempt } from "./types";
import type { SpeakingRecording, SpeakingSessionDraft } from "./types";

class EnglishLearningDB extends Dexie {
  profiles!: Table<Profile, string>;
  preferences!: Table<Preferences, string>;
  attempts!: Table<Attempt, string>;
  drafts!: Table<Draft, [string, string]>;
  bookmarks!: Table<Bookmark, [string, string]>;
  vocab!: Table<VocabEntry, string>;
  notes!: Table<Note, [string, string]>;
  writingDrafts!: Table<WritingDraft, [string, string]>;
  writingAttempts!: Table<WritingAttempt, string>;
  speakingRecordings!: Table<SpeakingRecording, string>;
  speakingSessionDrafts!: Table<SpeakingSessionDraft, [string, string]>;

  constructor() {
    super("english-learning");
    this.version(1).stores({
      profiles: "id",
      preferences: "profileId",
      attempts: "id, [profileId+lessonId], completedAt",
      drafts: "[profileId+lessonId]",
    });
    // v2 adds contentZoom to preferences. Backfill on rows from v1.
    this.version(2)
      .stores({
        profiles: "id",
        preferences: "profileId",
        attempts: "id, [profileId+lessonId], completedAt",
        drafts: "[profileId+lessonId]",
      })
      .upgrade((tx) =>
        tx
          .table("preferences")
          .toCollection()
          .modify((p: Preferences) => {
            if (p.contentZoom == null) p.contentZoom = DEFAULT_CONTENT_ZOOM;
          }),
      );
    // v3: split attempt scores into mc/cloze; drafts gain clozePicks.
    // v1/v2 attempts had only MC, so backfill mcScore=score, mcTotal=total,
    // clozeScore=0, clozeTotal=0. v1/v2 drafts had only MC picks → clozePicks={}.
    this.version(3)
      .stores({
        profiles: "id",
        preferences: "profileId",
        attempts: "id, [profileId+lessonId], completedAt",
        drafts: "[profileId+lessonId]",
      })
      .upgrade(async (tx) => {
        await tx
          .table("attempts")
          .toCollection()
          .modify((a: Attempt) => {
            if (a.mcScore == null) {
              a.mcScore = a.score;
              a.mcTotal = a.total;
              a.clozeScore = 0;
              a.clozeTotal = 0;
            }
          });
        await tx
          .table("drafts")
          .toCollection()
          .modify((d: Draft) => {
            if (d.clozePicks == null) d.clozePicks = {};
          });
      });
    // v4: additive — three new tables for bookmarks, vocab, and notes.
    // The `vocab` table carries indexes for dedup ([profileId+phraseLower]) and
    // common filters ([profileId+sourceLessonId], [profileId+addedAt]).
    this.version(4).stores({
      profiles: "id",
      preferences: "profileId",
      attempts: "id, [profileId+lessonId], completedAt",
      drafts: "[profileId+lessonId]",
      bookmarks: "[profileId+lessonId], profileId",
      vocab:
        "id, [profileId+phraseLower], [profileId+sourceLessonId], [profileId+addedAt]",
      notes: "[profileId+lessonId]",
    });
    // v5: additive — two new tables for writing drafts and writing attempts.
    // Bookmarks/notes are reused across reading + writing (lessonId-keyed).
    this.version(5).stores({
      profiles: "id",
      preferences: "profileId",
      attempts: "id, [profileId+lessonId], completedAt",
      drafts: "[profileId+lessonId]",
      bookmarks: "[profileId+lessonId], profileId",
      vocab:
        "id, [profileId+phraseLower], [profileId+sourceLessonId], [profileId+addedAt]",
      notes: "[profileId+lessonId]",
      writingDrafts: "[profileId+lessonId]",
      writingAttempts: "id, [profileId+lessonId], completedAt",
    });
    // v6: additive — two new tables for speaking recordings and in-progress session drafts.
    this.version(6).stores({
      profiles: "id",
      preferences: "profileId",
      attempts: "id, [profileId+lessonId], completedAt",
      drafts: "[profileId+lessonId]",
      bookmarks: "[profileId+lessonId], profileId",
      vocab: "id, [profileId+phraseLower], [profileId+sourceLessonId], [profileId+addedAt]",
      notes: "[profileId+lessonId]",
      writingDrafts: "[profileId+lessonId]",
      writingAttempts: "id, [profileId+lessonId], completedAt",
      speakingRecordings: "id, [profileId+lessonId], completedAt",
      speakingSessionDrafts: "[profileId+lessonId]",
    });
  }
}

export const db = new EnglishLearningDB();
