import { cn } from "@/lib/utils";
import { LEVEL_STYLES } from "@/lib/levels";
import type { CefrLevel } from "@/lib/lessons/types";

/** The small CEFR level pill (A1–C1), colored per the shared level token map. */
export function LevelBadge({ level, className }: { level: CefrLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold",
        LEVEL_STYLES[level].badge,
        className,
      )}
    >
      {level}
    </span>
  );
}
