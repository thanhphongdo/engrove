import Dexie, { type Table } from "dexie";
import type { Profile, Preferences, Attempt, Draft } from "./types";

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
  }
}

export const db = new EnglishLearningDB();
