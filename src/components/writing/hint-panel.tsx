"use client";

import type { WritingLesson } from "@/lib/lessons/types";

export function HintPanel({ lesson }: { lesson: WritingLesson }) {
  return (
    <section className="rounded-md border bg-card p-3 sm:p-4 text-sm shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Hints
      </h2>
      {lesson.hintStarters.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold">Sentence starters</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {lesson.hintStarters.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {lesson.hintVocab.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold">Useful words</p>
          <ul className="space-y-0.5 text-sm">
            {lesson.hintVocab.map((v) => (
              <li key={v.phrase} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{v.phrase}</span>
                {v.pronunciation && (
                  <span className="text-xs text-muted-foreground">
                    {v.pronunciation}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">— {v.meaningVi}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
