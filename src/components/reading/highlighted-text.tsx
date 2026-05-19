"use client";

import { Fragment } from "react";
import { normalizeRanges } from "@/lib/lessons/search-and-sort";
import { cn } from "@/lib/utils";

const DEFAULT_MARK_CLASS =
  "rounded-sm bg-yellow-200/70 px-0.5 text-foreground dark:bg-yellow-400/25";

export function HighlightedText({
  text,
  ranges,
  className,
  markClassName,
}: {
  text: string;
  ranges?: ReadonlyArray<readonly [number, number]>;
  className?: string;
  markClassName?: string;
}) {
  const normalized = normalizeRanges(ranges ?? [], text.length);
  if (normalized.length === 0) {
    return <span className={className}>{text}</span>;
  }
  const segments: Array<{ text: string; mark: boolean }> = [];
  let cursor = 0;
  for (const [start, end] of normalized) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), mark: false });
    }
    segments.push({ text: text.slice(start, end), mark: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), mark: false });
  }
  return (
    <span className={className}>
      {segments.map((s, i) =>
        s.mark ? (
          <mark key={i} className={cn(DEFAULT_MARK_CLASS, markClassName)}>
            {s.text}
          </mark>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </span>
  );
}
