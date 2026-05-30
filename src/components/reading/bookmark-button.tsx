"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsBookmarked, useToggleBookmark } from "@/lib/db/use-bookmarks";

/**
 * Star toggle. Variants:
 *   - "card": positioned absolutely; stops the wrapping <Link>'s click.
 *   - "inline": flows in a header bar.
 */
export function BookmarkButton({
  lessonId,
  variant,
}: {
  lessonId: string;
  variant: "card" | "inline";
}) {
  const active = useIsBookmarked(lessonId);
  const toggle = useToggleBookmark();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(lessonId).catch(() => {});
  };

  const base =
    "inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const cardClass = "absolute right-2.5 top-2.5 size-7";
  const inlineClass = "size-8 hover:bg-accent";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? "Remove bookmark" : "Bookmark lesson"}
      title={active ? "Remove bookmark" : "Bookmark lesson"}
      className={cn(base, variant === "card" ? cardClass : inlineClass)}
    >
      <Star
        className={cn(
          "size-4",
          active ? "fill-amber-400 stroke-amber-500" : "stroke-muted-foreground",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
