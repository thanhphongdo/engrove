"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { encodeCsv } from "@/lib/csv";
import type { VocabEntry } from "@/lib/db/types";

const HEADER = [
  "phrase",
  "meaningVi",
  "pronunciation",
  "exampleEn",
  "sourceLessonId",
  "addedAt",
] as const;

export function VocabExportButton({ entries }: { entries: VocabEntry[] }) {
  function handleClick() {
    const rows = entries.map((e) => [
      e.phrase,
      e.meaningVi,
      e.pronunciation,
      e.exampleEn,
      e.sourceLessonId,
      new Date(e.addedAt).toISOString(),
    ]);
    const csv = encodeCsv(HEADER, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocab-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={entries.length === 0}
    >
      <Download className="mr-1 size-3.5" aria-hidden="true" />
      Export CSV
    </Button>
  );
}
