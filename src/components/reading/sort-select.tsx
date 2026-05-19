"use client";

import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortBy } from "@/lib/lessons/search-and-sort";

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
        <ArrowUpDown className="size-3 text-muted-foreground" aria-hidden="true" />
        <SelectValue>Sort: {LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="name">Name</SelectItem>
        <SelectItem value="level">Level</SelectItem>
        <SelectItem value="random">Random</SelectItem>
      </SelectContent>
    </Select>
  );
}
