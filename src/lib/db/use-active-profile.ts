"use client";

/**
 * Returns the active profile id.
 *
 * Currently always returns the literal "default" — the app is single-profile
 * today (see spec §3 "profile model"). When multi-profile lands, this hook is
 * the only place that needs to change.
 */
export function useActiveProfileId(): string {
  return "default";
}
