"use client";

import type { GrammarNote } from "@/lib/lessons/types";

export function GrammarNotes({ notes }: { notes: GrammarNote[] }) {
  if (notes.length === 0) return null;
  return (
    <section className="rounded-md border-l-4 border-primary bg-muted/40 p-3 sm:p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Grammar notes
      </h2>
      <div className="space-y-2">
        {notes.map((n, i) => (
          <details key={i} className="group">
            <summary className="cursor-pointer text-sm font-medium">{n.title}</summary>
            <p className="mt-1 text-sm leading-relaxed">{n.bodyVi}</p>
            <p className="mt-1 text-xs italic text-muted-foreground">{n.bodyEn}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
