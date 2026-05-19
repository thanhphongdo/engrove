"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import { useActiveProfileId } from "./use-active-profile";

/** Set of lesson IDs the active profile has an in-progress draft for. */
export function useDrafts(): Set<string> | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    const rows = await db.drafts
      .where("[profileId+lessonId]")
      .between([profileId, ""], [profileId, "￿"])
      .toArray();
    return new Set(rows.map((r) => r.lessonId));
  }, [profileId]);
}
