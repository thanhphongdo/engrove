"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./client";
import { useActiveProfileId } from "./use-active-profile";
import { computeStreak, type StreakSummary } from "@/lib/streak";

const EMPTY: StreakSummary = { current: 0, longest: 0, lastActiveDate: null };

export function useStreak(): StreakSummary {
  const profileId = useActiveProfileId();
  return (
    useLiveQuery(async () => {
      const attempts = await db.attempts.where({ profileId }).toArray();
      return computeStreak(attempts);
    }, [profileId]) ?? EMPTY
  );
}
