import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The standard rounded-2xl content card used across lesson-detail sections. */
export function DetailCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** A small uppercase eyebrow heading used inside detail cards/blocks. */
export function CardHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400", className)}>
      {children}
    </h2>
  );
}
