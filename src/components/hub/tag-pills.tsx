"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Tag filter row: top-N tags by frequency as pills + a "More" dialog with a
 * searchable, keyboard-navigable tag list. Styled per the mockup; behavior
 * mirrors the original TagFilterRow.
 */
export function TagPills({
  tagCounts,
  selected,
  onChange,
  topN = 10,
}: {
  tagCounts: Map<string, number>;
  selected: string[];
  onChange: (next: string[]) => void;
  topN?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);

  const sortedByCount = useMemo(
    () =>
      Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([tag]) => tag),
    [tagCounts],
  );

  const visibleTags = useMemo(() => {
    const top = new Set(sortedByCount.slice(0, topN));
    selected.forEach((t) => top.add(t));
    return Array.from(top).sort((a, b) => {
      const ca = tagCounts.get(a) ?? 0;
      const cb = tagCounts.get(b) ?? 0;
      return cb - ca || a.localeCompare(b);
    });
  }, [sortedByCount, selected, topN, tagCounts]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? sortedByCount.filter((t) => t.toLowerCase().includes(q)) : sortedByCount;
  }, [sortedByCount, query]);

  const updateQuery = (next: string) => {
    setQuery(next);
    setFocusedIndex(0);
  };
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery("");
      setFocusedIndex(0);
    }
  };

  const toggle = (tag: string) =>
    onChange(selected.includes(tag) ? selected.filter((x) => x !== tag) : [...selected, tag]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const tag = filtered[focusedIndex];
      if (tag) toggle(tag);
    }
  };

  if (tagCounts.size === 0) return null;

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Tags
        </span>
        {visibleTags.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={active}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 transition-colors",
                active
                  ? "bg-neutral-900 font-medium text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10",
              )}
            >
              {tag}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search all tags"
          className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-500 transition-colors hover:bg-neutral-200/70 dark:bg-white/8 dark:hover:bg-white/12"
        >
          <Plus className="size-3" aria-hidden="true" />
          More
        </button>
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>All tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => updateQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search tags…"
                className="pl-8"
              />
            </div>
            <div className="max-h-[55vh] overflow-y-auto rounded-md border sm:max-h-80">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No tags match.</p>
              ) : (
                <ul role="listbox" aria-label="Tags">
                  {filtered.map((tag, i) => {
                    const active = selected.includes(tag);
                    const focused = i === focusedIndex;
                    return (
                      <li key={tag}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => toggle(tag)}
                          onMouseEnter={() => setFocusedIndex(i)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-left text-sm transition-colors last:border-b-0",
                            focused && "bg-accent",
                            active && "text-primary",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Check className={cn("size-3.5 shrink-0", active ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                            {tag}
                          </span>
                          <span className="text-xs text-muted-foreground">{tagCounts.get(tag) ?? 0}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selected.length === 0
                ? "No tags selected."
                : `${selected.length} tag${selected.length === 1 ? "" : "s"} selected.`}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
