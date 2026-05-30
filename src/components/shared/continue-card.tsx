import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * "Continue where you left off" card. Shared between the landing welcome-back
 * band and the skill hubs. When `progressPercent` is given it shows a progress
 * bar with `progressLabel`; otherwise `progressLabel` renders as muted meta text.
 */
export function ContinueCard({
  href,
  icon,
  eyebrow = "Continue where you left off",
  title,
  progressPercent,
  progressLabel,
  className,
}: {
  href: string;
  icon: ReactNode;
  eyebrow?: string;
  title: string;
  progressPercent?: number;
  progressLabel?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-2xl bg-linear-to-r from-emerald-50 to-white p-4 transition-shadow hover:shadow-sm dark:from-emerald-500/10 dark:to-neutral-900",
        className,
      )}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          {eyebrow}
        </p>
        <p className="truncate font-semibold">{title}</p>
        {progressPercent != null ? (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-500/20">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
              />
            </div>
            {progressLabel && <span className="text-xs text-neutral-500">{progressLabel}</span>}
          </div>
        ) : (
          progressLabel && <p className="mt-0.5 text-xs text-neutral-500">{progressLabel}</p>
        )}
      </div>
      <span className="hidden shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 sm:block">
        Continue
      </span>
    </Link>
  );
}
