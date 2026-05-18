"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import {
  setHintToggle as setHintToggleQ,
  setDetailLayout as setDetailLayoutQ,
} from "./queries";
import type { HintToggles, DetailLayout, Preferences } from "./types";
import { DEFAULT_HINT_TOGGLES } from "./types";

const FALLBACK: Preferences = {
  profileId: "default",
  hintToggles: { ...DEFAULT_HINT_TOGGLES },
  detailLayout: "two-column",
  activeProfileId: "default",
};

export function usePreferences(): Preferences {
  return useLiveQuery(() => db.preferences.get("default"), [], FALLBACK) ?? FALLBACK;
}

export async function setHintToggle(key: keyof HintToggles, value: boolean) {
  await setHintToggleQ("default", key, value);
}

export async function setDetailLayout(layout: DetailLayout) {
  await setDetailLayoutQ("default", layout);
}
