"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DetailCard } from "@/components/lesson/detail-card";
import type { WritingLesson, Annotation } from "@/lib/lessons/types";

/**
 * A vocabulary chip that reveals the word's full info (pronunciation, Vietnamese
 * meaning, example) in a tooltip on hover (desktop) or tap/click (mobile).
 */
function VocabChip({ item }: { item: Annotation }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
        >
          {item.phrase}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-60"
      >
        <p className="font-semibold text-foreground">
          {item.phrase}
          {item.pronunciation && (
            <span className="ml-2 font-normal text-muted-foreground">{item.pronunciation}</span>
          )}
        </p>
        <p className="mt-1 text-sm text-foreground">{item.meaningVi}</p>
        {item.exampleEn && (
          <p className="mt-1 text-xs italic text-muted-foreground">{item.exampleEn}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function HintPanel({ lesson }: { lesson: WritingLesson }) {
  const hasVocab = lesson.hintVocab.length > 0;
  const hasStarters = lesson.hintStarters.length > 0;
  if (!hasVocab && !hasStarters) return null;

  return (
    <DetailCard>
      {hasVocab && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            Useful vocabulary
          </h2>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {lesson.hintVocab.map((v) => (
              <VocabChip key={v.phrase} item={v} />
            ))}
          </div>
        </>
      )}
      {hasStarters && (
        <>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Sentence starters
          </h3>
          <ul className="space-y-1.5 text-sm text-neutral-700 dark:text-neutral-300">
            {lesson.hintStarters.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true">
                  ›
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </DetailCard>
  );
}
