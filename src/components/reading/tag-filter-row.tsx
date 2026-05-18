"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TagFilterRow({
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

  const sortedByCount = useMemo(() => {
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [tagCounts]);

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
    if (!q) return sortedByCount;
    return sortedByCount.filter((t) => t.toLowerCase().includes(q));
  }, [sortedByCount, query]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusedIndex(0);
    }
  }, [open]);

  const toggle = (tag: string) => {
    onChange(
      selected.includes(tag)
        ? selected.filter((x) => x !== tag)
        : [...selected, tag],
    );
  };

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

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-foreground">
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
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                active
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent",
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
          className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-3" aria-hidden="true" />
          More
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>All tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search tags…"
                className="pl-8"
              />
            </div>
            <div className="max-h-[55vh] overflow-y-auto rounded-md border sm:max-h-80">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No tags match.
                </p>
              ) : (
                <ul role="listbox" aria-label="Tags">
                  {filtered.map((tag, i) => {
                    const active = selected.includes(tag);
                    const focused = i === focusedIndex;
                    const count = tagCounts.get(tag) ?? 0;
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
                            <Check
                              className={cn(
                                "size-3.5 shrink-0",
                                active ? "opacity-100" : "opacity-0",
                              )}
                              aria-hidden="true"
                            />
                            {tag}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {count}
                          </span>
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
