"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VocabEntry } from "@/lib/db/types";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
}

export function VocabRow({
  entry,
  onDelete,
}: {
  entry: VocabEntry;
  onDelete: (id: string) => void;
}) {
  return (
    <tr className="border-t">
      <td className="py-2 pr-3 align-top text-sm font-medium">{entry.phrase}</td>
      <td className="py-2 pr-3 align-top text-sm">{entry.meaningVi}</td>
      <td className="py-2 pr-3 align-top text-xs text-muted-foreground">
        {entry.pronunciation ?? ""}
      </td>
      <td className="py-2 pr-3 align-top text-xs">
        <Link
          href={`/${entry.sourceLessonId.startsWith("speaking-") ? "speaking" : "reading"}/${entry.sourceLessonId}`}
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          {entry.sourceLessonId}
        </Link>
      </td>
      <td className="py-2 pr-3 align-top text-xs text-muted-foreground">
        {formatDate(entry.addedAt)}
      </td>
      <td className="py-2 align-top">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-7 p-0"
          aria-label={`Delete ${entry.phrase}`}
          onClick={() => onDelete(entry.id)}
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      </td>
    </tr>
  );
}
