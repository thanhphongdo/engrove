"use client";

import { cn } from "@/lib/utils";
import { CEFR_LEVELS } from "@/lib/levels";

const PILL = "shrink-0 rounded-full px-3 py-1 text-xs transition-colors";
const ACTIVE = "bg-emerald-600 font-semibold text-white";
const IDLE = "font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10";

/** "All" + A1–C1 level filter pills (multi-select; "All" clears the selection). */
export function LevelPills({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const all = selected.length === 0;
  return (
    <>
      <button type="button" onClick={() => onChange([])} aria-pressed={all} className={cn(PILL, all ? ACTIVE : IDLE)}>
        All
      </button>
      {CEFR_LEVELS.map((level) => {
        const active = selected.includes(level);
        return (
          <button
            key={level}
            type="button"
            aria-pressed={active}
            onClick={() =>
              onChange(active ? selected.filter((l) => l !== level) : [...selected, level])
            }
            className={cn(PILL, active ? ACTIVE : IDLE)}
          >
            {level}
          </button>
        );
      })}
    </>
  );
}
