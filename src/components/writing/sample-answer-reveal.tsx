"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GrammarNotes } from "@/components/reading/grammar-notes";
import { useWritingSession } from "./writing-session";

export function SampleAnswerReveal() {
  const { lesson, sampleRevealed, revealSample } = useWritingSession();
  const [open, setOpen] = useState(sampleRevealed);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !sampleRevealed) revealSample();
  }

  return (
    <section className="rounded-md border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-sm font-semibold"
        aria-expanded={open}
      >
        <span>Sample answer{sampleRevealed && !open ? " (viewed)" : ""}</span>
        {open ? (
          <ChevronUp className="size-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <article className="text-sm leading-relaxed">{lesson.sampleText}</article>
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide">
              Vietnamese translation
            </summary>
            <div className="mt-2 space-y-1 leading-relaxed">
              {lesson.sampleTranslationVi.split(/\n+/).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </details>
          {lesson.sampleGrammarNotes.length > 0 && (
            <GrammarNotes notes={lesson.sampleGrammarNotes} />
          )}
        </div>
      )}
    </section>
  );
}
