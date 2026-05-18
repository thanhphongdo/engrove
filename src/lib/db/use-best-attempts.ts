"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import { useActiveProfileId } from "./use-active-profile";
import type { Attempt } from "./types";

export function useBestAttempts(profileId: string): Map<string, Attempt> | undefined {
  return useLiveQuery(async () => {
    const all = await db.attempts.where({ profileId }).toArray();
    const best = new Map<string, Attempt>();
    for (const a of all) {
      const prev = best.get(a.lessonId);
      if (!prev || a.score > prev.score) best.set(a.lessonId, a);
    }
    return best;
  }, [profileId]);
}

export function useDefaultBestAttempts() {
  const profileId = useActiveProfileId();
  return useBestAttempts(profileId);
}
