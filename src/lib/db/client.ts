import Dexie, { type Table } from "dexie";
import type { Profile, Preferences, Attempt, Draft } from "./types";
import { DEFAULT_CONTENT_ZOOM } from "./types";

class EnglishLearningDB extends Dexie {
  profiles!: Table<Profile, string>;
  preferences!: Table<Preferences, string>;
  attempts!: Table<Attempt, string>;
  drafts!: Table<Draft, [string, string]>;

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
  }
}

export const db = new EnglishLearningDB();
