"use client";

import type { GrammarNote } from "@/lib/lessons/types";

export function GrammarNotes({ notes }: { notes: GrammarNote[] }) {
  if (notes.length === 0) return null;
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Grammar notes
      </h2>
      <div className="space-y-2">
        {notes.map((n, i) => (
          <details key={i} className="group">
            <summary className="cursor-pointer text-sm font-medium">{n.title}</summary>
            <p className="mt-1 text-sm leading-relaxed">{n.bodyVi}</p>
            <p className="mt-1 text-xs italic text-neutral-500">{n.bodyEn}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
