"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import {
  deleteVocab as deleteVocabQ,
  restoreVocab as restoreVocabQ,
  saveVocab as saveVocabQ,
  type SaveVocabInput,
} from "./queries";
import { useActiveProfileId } from "./use-active-profile";
import type { VocabEntry } from "./types";

export function useVocab(): VocabEntry[] | undefined {
  const profileId = useActiveProfileId();
  return useLiveQuery(async () => {
    return db.vocab
      .where("[profileId+addedAt]")
      .between([profileId, -Infinity], [profileId, Infinity])
      .reverse()
      .toArray();
  }, [profileId]);
}

export function useSaveVocab() {
  const profileId = useActiveProfileId();
  return useCallback(
    (input: SaveVocabInput) => saveVocabQ(profileId, input),
    [profileId],
  );
}

export function useDeleteVocab() {
  return useCallback(async (id: string) => deleteVocabQ(id), []);
}

export function useRestoreVocab() {
  return useCallback(async (entry: VocabEntry) => restoreVocabQ(entry), []);
}
