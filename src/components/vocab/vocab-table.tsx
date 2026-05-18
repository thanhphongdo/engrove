"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useDeleteVocab, useRestoreVocab } from "@/lib/db/use-vocab";
import { VocabRow } from "./vocab-row";
import type { VocabEntry } from "@/lib/db/types";

type SortMode = "recent" | "alpha";

export function VocabTable({ entries }: { entries: VocabEntry[] }) {
  const [query, setQuery] = useState("");
  const [lessonFilter, setLessonFilter] = useState<string>("__all");
  const [sort, setSort] = useState<SortMode>("recent");

  const deleteVocab = useDeleteVocab();
  const restoreVocab = useRestoreVocab();

  const lessonIds = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.sourceLessonId));
    return Array.from(set).sort();
  }, [entries]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = entries;
    if (lessonFilter !== "__all") {
      rows = rows.filter((e) => e.sourceLessonId === lessonFilter);
    }
    if (q) {
      rows = rows.filter(
        (e) =>
          e.phraseLower.includes(q) ||
          e.meaningVi.toLowerCase().includes(q),
      );
    }
    if (sort === "alpha") {
      rows = [...rows].sort((a, b) => a.phraseLower.localeCompare(b.phraseLower));
    }
    // entries already come back in "recent first" order from useVocab().
    return rows;
  }, [entries, query, lessonFilter, sort]);

  async function handleDelete(id: string) {
    const removed = await deleteVocab(id);
    if (!removed) return;
    toast.success(`Deleted "${removed.phrase}"`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          restoreVocab(removed).catch(() => {});
        },
      },
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search phrase or meaning"
          className="h-8 max-w-xs"
        />
        <Select value={lessonFilter} onValueChange={setLessonFilter}>
          <SelectTrigger size="sm" className="h-8 w-[12rem]">
            <SelectValue placeholder="All lessons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All lessons</SelectItem>
            {lessonIds.map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
          <SelectTrigger size="sm" className="h-8 w-[12rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently added</SelectItem>
            <SelectItem value="alpha">Alphabetical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No vocab matches the current filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Phrase</th>
                <th className="px-3 py-2 text-left font-medium">Meaning (Vi)</th>
                <th className="px-3 py-2 text-left font-medium">Pronunciation</th>
                <th className="px-3 py-2 text-left font-medium">Source lesson</th>
                <th className="px-3 py-2 text-left font-medium">Added</th>
                <th className="px-3 py-2 text-left font-medium">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => (
                <VocabRow key={entry.id} entry={entry} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
