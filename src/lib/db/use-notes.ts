"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import { setNote as setNoteQ } from "./queries";
import { useActiveProfileId } from "./use-active-profile";
import type { Note } from "./types";

export function useNote(lessonId: string): Note | undefined | null {
  const profileId = useActiveProfileId();
  return useLiveQuery(
    () => db.notes.get([profileId, lessonId]),
    [profileId, lessonId],
  );
}

export function useSetNote() {
  const profileId = useActiveProfileId();
  return useCallback(
    async (lessonId: string, text: string) => {
      await setNoteQ(profileId, lessonId, text);
    },
    [profileId],
  );
}
