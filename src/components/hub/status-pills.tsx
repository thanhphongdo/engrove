"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HubStatus } from "./use-hub-filters";

const PILL = "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors";
const IDLE = "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10";

// Active color keyed off the underlying status semantics (not the per-skill label).
const ACTIVE: Record<HubStatus, string> = {
  learning: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  learned: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export type StatusOption = { value: HubStatus; label: string };

/** Favorites toggle + the two per-skill status filters (mutually exclusive). */
export function StatusPills({
  favoritesActive,
  onToggleFavorites,
  options,
  activeStatus,
  onStatus,
}: {
  favoritesActive: boolean;
  onToggleFavorites: () => void;
  options: StatusOption[];
  activeStatus: HubStatus | null;
  onStatus: (next: HubStatus | null) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleFavorites}
        aria-pressed={favoritesActive}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
          favoritesActive
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
            : IDLE,
        )}
      >
        <Star className={cn("size-3", favoritesActive && "fill-amber-400 stroke-amber-500")} aria-hidden="true" />
        Favorites
      </button>
      {options.map((opt) => {
        const active = activeStatus === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onStatus(active ? null : opt.value)}
            className={cn(PILL, active ? ACTIVE[opt.value] : IDLE)}
          >
            {opt.label}
          </button>
        );
      })}
    </>
  );
}
