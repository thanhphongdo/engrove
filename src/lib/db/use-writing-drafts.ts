"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import { useActiveProfileId } from "./use-active-profile";

/** Returns a Set of lessonIds that have an in-progress writing draft. */
export function useWritingDrafts(): Set<string> | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    const rows = await db.writingDrafts.where({ profileId }).toArray();
    return new Set(rows.map((r) => r.lessonId));
  }, [profileId]);
}
