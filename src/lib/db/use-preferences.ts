"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import {
  setHintToggle as setHintToggleQ,
  setDetailLayout as setDetailLayoutQ,
} from "./queries";
import { useActiveProfileId } from "./use-active-profile";
import type { HintToggles, DetailLayout, Preferences } from "./types";
import { DEFAULT_HINT_TOGGLES } from "./types";

// Used both as a Dexie initial value (must be a defined Preferences) and as a
// runtime fallback. The literals here are the bootstrap shape of a Preferences
// record (matching queries.ts DEFAULT_PROFILE_ID), not runtime profile lookups.
function makeFallback(profileId: string): Preferences {
  return {
    profileId,
    hintToggles: { ...DEFAULT_HINT_TOGGLES },
    detailLayout: "two-column",
    activeProfileId: profileId,
  };
}

export function usePreferences(): Preferences {
  const profileId = useActiveProfileId();
  const fallback = makeFallback(profileId);
  return (
    useLiveQuery(() => db.preferences.get(profileId), [profileId], fallback) ?? fallback
  );
}

export function useSetHintToggle() {
  const profileId = useActiveProfileId();
  return useCallback(
    async (key: keyof HintToggles, value: boolean) => {
      await setHintToggleQ(profileId, key, value);
    },
    [profileId],
  );
}

export function useSetDetailLayout() {
  const profileId = useActiveProfileId();
  return useCallback(
    async (layout: DetailLayout) => {
      await setDetailLayoutQ(profileId, layout);
    },
    [profileId],
  );
}
