"use client";

import { DetailCard } from "@/components/lesson/detail-card";
import type { WritingLesson } from "@/lib/lessons/types";

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
              <span
                key={v.phrase}
                title={v.pronunciation ? `${v.pronunciation} — ${v.meaningVi}` : v.meaningVi}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                {v.phrase}
              </span>
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
