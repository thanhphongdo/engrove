"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import { useActiveProfileId } from "./use-active-profile";
import type { WritingAttempt } from "./types";

export function useBestWritingAttempts(): Map<string, WritingAttempt> | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    const all = await db.writingAttempts.where({ profileId }).toArray();
    const best = new Map<string, WritingAttempt>();
    for (const a of all) {
      const prev = best.get(a.lessonId);
      const prevOverall = prev?.llmResult?.scores.overall ?? -1;
      const curOverall = a.llmResult?.scores.overall ?? -1;
      if (!prev || curOverall > prevOverall) best.set(a.lessonId, a);
    }
    return best;
  }, [profileId]);
}
