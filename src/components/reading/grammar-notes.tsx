"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrammarNote } from "@/lib/lessons/types";

/** Collapsible "Grammar notes" card — closed by default. */
export function GrammarNotes({ notes }: { notes: GrammarNote[] }) {
  const [open, setOpen] = useState(false);
  if (notes.length === 0) return null;
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-1.5 text-left"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Grammar notes
        </h2>
        <ChevronDown
          className={cn("size-4 shrink-0 text-neutral-400 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul className="mt-3 space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
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
      )}
    </section>
  );
}
