"use client";

import { ArrowDownNarrowWide, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SORT_OPTIONS, type SortBy } from "@/lib/lessons/search-and-sort";

const LABELS: Record<SortBy, string> = { name: "Name", level: "Level", random: "Random" };

/** Sort control styled as the mockup's pill button; keeps Name/Level/Random. */
export function SortButton({
  value,
  onChange,
}: {
  value: SortBy;
  onChange: (next: SortBy) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortBy)}>
      <SelectTrigger
        aria-label="Sort lessons"
        className="inline-flex h-auto shrink-0 items-center gap-1.5 rounded-xl border-0 bg-neutral-100 px-3 py-2.5 text-sm font-medium text-neutral-700 shadow-none hover:bg-neutral-200/70 dark:bg-white/8 dark:text-neutral-200 dark:hover:bg-white/12 [&>svg:last-child]:hidden"
      >
        <ArrowDownNarrowWide className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Sort: {LABELS[value]}</span>
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </SelectTrigger>
      <SelectContent align="end">
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
