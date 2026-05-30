"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ContentZoomControl } from "./content-zoom-control";

/**
 * "Aa" top-bar button that opens the content-zoom control in a popover.
 * Keeps the existing −/%/+ zoom feature (range 0.9–1.5) intact.
 */
export function TextSizePopover() {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Text size"
        className="hidden size-9 place-items-center rounded-lg text-[0.8rem] font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10 sm:grid"
      >
        Aa
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 gap-2">
        <p className="px-0.5 text-xs font-medium text-muted-foreground">Reading text size</p>
        <ContentZoomControl />
      </PopoverContent>
    </Popover>
  );
}
