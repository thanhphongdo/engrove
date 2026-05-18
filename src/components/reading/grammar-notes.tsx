"use client";

import type { GrammarNote } from "@/lib/lessons/types";

export function GrammarNotes({ notes }: { notes: GrammarNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="mt-4 space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grammar notes</p>
      {notes.map((n, i) => (
        <details key={i} className="group">
          <summary className="cursor-pointer font-medium">{n.title}</summary>
          <p className="mt-1 text-sm">{n.bodyVi}</p>
          <p className="mt-1 text-xs italic text-muted-foreground">{n.bodyEn}</p>
        </details>
      ))}
    </div>
  );
}
