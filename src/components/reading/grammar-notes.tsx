"use client";

import type { GrammarNote } from "@/lib/lessons/types";

export function GrammarNotes({ notes }: { notes: GrammarNote[] }) {
  if (notes.length === 0) return null;
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Grammar notes
      </h2>
      <ul className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
        {notes.map((n, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-1.25 size-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{n.title}</strong> — {n.bodyVi}{" "}
              <span className="italic text-neutral-500 dark:text-neutral-400">{n.bodyEn}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
