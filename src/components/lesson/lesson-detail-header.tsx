import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { LevelBadge } from "@/components/shared/level-badge";
import type { CefrLevel } from "@/lib/lessons/types";

/**
 * Sticky lesson-detail header shared by all four skill detail pages: a back
 * link, the title, a level badge + meta strip, and a toolbar slot on the right.
 * Sticks just below the 56px top app bar (top-14).
 */
export function LessonDetailHeader({
  backHref,
  backLabel,
  level,
  title,
  meta,
  toolbar,
  align = "start",
}: {
  backHref: string;
  backLabel: string;
  level: CefrLevel;
  title: string;
  meta?: ReactNode;
  toolbar?: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <div className="sticky top-14 z-30 -mx-4 border-b border-neutral-200/70 bg-neutral-50/90 px-4 pb-2.5 pt-3 backdrop-blur dark:border-white/5 dark:bg-neutral-950/90 sm:-mx-6 sm:px-6">
      <Link
        href={backHref}
        className="mb-1.5 inline-flex items-center gap-1 text-[0.8rem] text-neutral-500 transition-colors hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" /> {backLabel}
      </Link>
      <div
        className={`flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-3 ${
          align === "center" ? "sm:items-center" : "sm:items-start"
        }`}
      >
        <div className="min-w-0">
          <h1 className="min-w-0 text-xl font-bold leading-tight tracking-tight sm:text-2xl">{title}</h1>
          {meta != null && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8rem]">
              <LevelBadge level={level} />
              {meta}
            </div>
          )}
        </div>
        {toolbar && <div className="flex shrink-0 items-center gap-2 overflow-x-auto no-scrollbar">{toolbar}</div>}
      </div>
    </div>
  );
}
