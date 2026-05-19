"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS, type SortBy } from "@/lib/lessons/search-and-sort";

const LABELS: Record<SortBy, string> = {
  name: "Name",
  level: "Level",
  random: "Random",
};

export function SortSelect({
  value,
  onChange,
}: {
  value: SortBy;
  onChange: (next: SortBy) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortBy)}>
      <SelectTrigger
        size="sm"
        aria-label="Sort lessons"
        className="rounded-full px-2.5 text-xs"
      >
        <SelectValue>Sort: {LABELS[value]}</SelectValue>
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
