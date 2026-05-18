"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import { toggleBookmark as toggleBookmarkQ } from "./queries";
import { useActiveProfileId } from "./use-active-profile";

/** Set of lesson IDs the active profile has bookmarked. */
export function useBookmarks(): Set<string> | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    const rows = await db.bookmarks.where("profileId").equals(profileId).toArray();
    return new Set(rows.map((r) => r.lessonId));
  }, [profileId]);
}

export function useIsBookmarked(lessonId: string): boolean {
  const set = useBookmarks();
  return set?.has(lessonId) ?? false;
}

export function useToggleBookmark() {
  const profileId = useActiveProfileId();
  return useCallback(
    async (lessonId: string) => {
      await toggleBookmarkQ(profileId, lessonId);
    },
    [profileId],
  );
}
