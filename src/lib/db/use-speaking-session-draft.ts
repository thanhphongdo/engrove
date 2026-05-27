"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import type { SpeakingSessionDraft } from "./types";
import { useActiveProfileId } from "./use-active-profile";

/** Current in-progress session draft for one lesson. Returns undefined while loading, null when absent. */
export function useSpeakingSessionDraft(lessonId: string): SpeakingSessionDraft | null | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(
    async () => (await db.speakingSessionDrafts.get([profileId, lessonId])) ?? null,
    [profileId, lessonId],
  );
}

/** Set of lessonIds with in-progress drafts, for the hub "Learning" filter. */
export function useSpeakingSessionDrafts(): Set<string> | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    const all = await db.speakingSessionDrafts.toArray();
    return new Set(all.filter((r) => r.profileId === profileId).map((r) => r.lessonId));
  }, [profileId]);
}

export function useSaveSpeakingSessionDraft() {
  const profileId = useActiveProfileId();
  return useCallback(
    async (draft: Omit<SpeakingSessionDraft, "profileId">) => {
      await db.speakingSessionDrafts.put({ profileId, ...draft });
    },
    [profileId],
  );
}

export function useDeleteSpeakingSessionDraft() {
  const profileId = useActiveProfileId();
  return useCallback(
    async (lessonId: string) => db.speakingSessionDrafts.delete([profileId, lessonId]),
    [profileId],
  );
}
