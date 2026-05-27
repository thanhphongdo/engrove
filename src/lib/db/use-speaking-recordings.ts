"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import type { SpeakingRecording } from "./types";
import { useActiveProfileId } from "./use-active-profile";

/** All recordings for a lesson, newest first. */
export function useSpeakingRecordings(lessonId: string): SpeakingRecording[] | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(
    async () => {
      const rows = await db.speakingRecordings
        .where("[profileId+lessonId]")
        .equals([profileId, lessonId])
        .toArray();
      return rows.sort((a, b) => b.completedAt - a.completedAt);
    },
    [profileId, lessonId],
  );
}

/** Map of lessonId → most recent recording, for the hub page "Learned" filter. */
export function useSpeakingRecordingsByLesson(): Map<string, SpeakingRecording> | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    // No standalone profileId index on this table — full scan is fine at this scale
    const all = await db.speakingRecordings.toArray();
    const map = new Map<string, SpeakingRecording>();
    for (const row of all.filter((r) => r.profileId === profileId)) {
      const existing = map.get(row.lessonId);
      if (!existing || row.completedAt > existing.completedAt) map.set(row.lessonId, row);
    }
    return map;
  }, [profileId]);
}

export function useSaveSpeakingRecording() {
  const profileId = useActiveProfileId();
  return useCallback(
    async (input: Omit<SpeakingRecording, "id" | "profileId">) => {
      const recording: SpeakingRecording = {
        id: crypto.randomUUID(),
        profileId,
        ...input,
      };
      await db.speakingRecordings.add(recording);
    },
    [profileId],
  );
}

export function useDeleteSpeakingRecording() {
  return useCallback(async (id: string) => db.speakingRecordings.delete(id), []);
}
