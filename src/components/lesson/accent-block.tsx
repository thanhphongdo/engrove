import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Accent = "emerald" | "amber" | "sky";

const BORDER: Record<Accent, string> = {
  emerald: "border-emerald-400",
  amber: "border-amber-400",
  sky: "border-sky-400",
};

/**
 * Tinted left-accent callout block — the shared primitive behind the resume
 * banner, writing prompt card, critical-thinking block, and similar callouts.
 */
export function AccentBlock({
  accent = "emerald",
  label,
  className,
  children,
}: {
  accent?: Accent;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border-l-4 bg-neutral-100/60 p-4 dark:bg-white/5", BORDER[accent], className)}>
      {label && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}
