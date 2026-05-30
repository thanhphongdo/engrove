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
    <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5"
      >
        <span>
          {open ? "Hide sample answer" : "Show sample answer"}
          {sampleRevealed && !open ? " (viewed)" : ""}
        </span>
        {open ? (
          <ChevronUp className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          {/* Each sample paragraph sits directly above its Vietnamese, rather
              than hiding the translation in a separate collapsible block. */}
          <article className="space-y-3 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
            {lesson.sampleText.split(/\n+/).map((para, i) => {
              const vi = lesson.sampleTranslationVi.split(/\n+/)[i];
              return (
                <div key={i} className="space-y-1">
                  <p>{para}</p>
                  {vi && (
                    <p className="text-[0.8125rem] italic leading-relaxed text-neutral-400 dark:text-neutral-500">
                      {vi}
                    </p>
                  )}
                </div>
              );
            })}
          </article>
          {lesson.sampleGrammarNotes.length > 0 && (
            <GrammarNotes notes={lesson.sampleGrammarNotes} />
          )}
        </div>
      )}
    </section>
  );
}
