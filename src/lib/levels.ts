import type { CefrLevel } from "@/lib/lessons/types";

export const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"];

/**
 * Per-level visual tokens, matching the mockup design system:
 * A1 emerald · A2 amber · B1 sky · B2 orange · C1 rose.
 *
 * Class strings are written out in full (not interpolated) so Tailwind's
 * scanner keeps them. `badge` = the small level pill; `accent` = the card's
 * left edge bar; `dot` = a small status dot.
 */
export const LEVEL_STYLES: Record<CefrLevel, { badge: string; accent: string; dot: string }> = {
  A1: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    accent: "bg-emerald-400",
    dot: "bg-emerald-400",
  },
  A2: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    accent: "bg-amber-400",
    dot: "bg-amber-400",
  },
  B1: {
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
    accent: "bg-sky-400",
    dot: "bg-sky-400",
  },
  B2: {
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
    accent: "bg-orange-400",
    dot: "bg-orange-400",
  },
  C1: {
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
    accent: "bg-rose-400",
    dot: "bg-rose-400",
  },
};

export const LEVEL_DESCRIPTORS: Record<CefrLevel, { name: string; blurb: string }> = {
  A1: { name: "Beginner", blurb: "First words & simple sentences" },
  A2: { name: "Elementary", blurb: "Everyday topics & routines" },
  B1: { name: "Intermediate", blurb: "Opinions & longer texts" },
  B2: { name: "Upper-int.", blurb: "Nuance & abstract ideas" },
  C1: { name: "Advanced", blurb: "Subtlety, tone & register" },
};
