"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LevelBadge } from "@/components/shared/level-badge";
import type { CefrLevel } from "@/lib/lessons/types";

/**
 * Sticky lesson-detail header: back link + title + toolbar slot only. The
 * tags/meta strip is intentionally NOT part of this (it lives in
 * <LessonMetaRow/> below the header so it scrolls away to save space — matching
 * the mockup). Sticks just below the 56px top app bar (top-14).
 *
 * The title is single-line/ellipsized by default; tapping it expands to the
 * full (wrapping) title, and it auto-collapses once the page scrolls past 60px.
 */
export function LessonDetailHeader({
  backHref,
  backLabel,
  title,
  toolbar,
  align = "start",
}: {
  backHref: string;
  backLabel: string;
  title: string;
  toolbar?: ReactNode;
  align?: "start" | "center";
}) {
  const [expanded, setExpanded] = useState(false);

  // Collapse the expanded title once the reader scrolls down past 60px.
  useEffect(() => {
    if (!expanded) return;
    const onScroll = () => {
      if (window.scrollY > 60) setExpanded(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [expanded]);

  return (
    <div className="sticky top-14 z-30 -mx-4 border-b border-neutral-200/70 bg-neutral-50/90 px-4 py-2.5 backdrop-blur dark:border-white/5 dark:bg-neutral-950/90 sm:-mx-6 sm:px-6">
      <div
        className={`flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-3 ${
          align === "center" ? "sm:items-center" : "sm:items-start"
        }`}
      >
        <div className="flex min-w-0 items-center gap-1">
          <Link
            href={backHref}
            aria-label={backLabel}
            title={backLabel}
            className="-ml-1.5 grid size-7 shrink-0 place-items-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-200"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          <h1
            onClick={() => setExpanded((e) => !e)}
            title={title}
            className={cn(
              "min-w-0 cursor-pointer text-xl font-bold leading-tight tracking-tight sm:text-2xl",
              expanded ? "" : "truncate",
            )}
          >
            {title}
          </h1>
        </div>
        {toolbar && <div className="flex shrink-0 items-center gap-2 overflow-x-auto no-scrollbar">{toolbar}</div>}
      </div>
    </div>
  );
}

/**
 * Non-sticky tags/meta strip rendered just below <LessonDetailHeader/>:
 * level badge + tags + per-skill meta. Scrolls away with the content.
 */
export function LessonMetaRow({ level, children }: { level: CefrLevel; children?: ReactNode }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]">
      <LevelBadge level={level} />
      {children}
    </div>
  );
}
