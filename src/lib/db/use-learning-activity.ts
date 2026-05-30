"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import { useActiveProfileId } from "./use-active-profile";
import { skillFromLessonId, type Skill } from "@/lib/skills";

export type RecentDraft = { lessonId: string; skill: Skill; updatedAt: number };

export type LearningActivity = {
  /** Distinct lessons with a completed attempt / submitted writing / saved recording. */
  lessonsDone: number;
  /** Whether the learner has any local activity at all (attempts or drafts). */
  hasActivity: boolean;
  /** The most recently touched in-progress draft across all skills, if any. */
  recent: RecentDraft | null;
};

/**
 * Aggregates the learner's local progress for the landing "welcome back" band.
 * Returns `undefined` while loading. A brand-new device resolves to
 * `{ lessonsDone: 0, hasActivity: false, recent: null }` so the band can hide.
 */
export function useLearningActivity(): LearningActivity | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    const [attempts, writingAttempts, recordings, drafts, writingDrafts, speakingDrafts] =
      await Promise.all([
        db.attempts.where({ profileId }).toArray(),
        db.writingAttempts.where({ profileId }).toArray(),
        db.speakingRecordings.where({ profileId }).toArray(),
        db.drafts.where({ profileId }).toArray(),
        db.writingDrafts.where({ profileId }).toArray(),
        db.speakingSessionDrafts.where({ profileId }).toArray(),
      ]);

    const done = new Set<string>();
    for (const a of attempts) done.add(a.lessonId);
    for (const a of writingAttempts) done.add(a.lessonId);
    for (const r of recordings) done.add(r.lessonId);

    const draftRows = [...drafts, ...writingDrafts, ...speakingDrafts];
    let recent: RecentDraft | null = null;
    if (draftRows.length) {
      const latest = draftRows.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
      recent = {
        lessonId: latest.lessonId,
        skill: skillFromLessonId(latest.lessonId),
        updatedAt: latest.updatedAt,
      };
    }

    return {
      lessonsDone: done.size,
      hasActivity: done.size > 0 || draftRows.length > 0,
      recent,
    };
  }, [profileId]);
}
