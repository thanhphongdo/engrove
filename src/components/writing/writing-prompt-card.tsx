"use client";

import type { WritingLesson } from "@/lib/lessons/types";

export function WritingPromptCard({ lesson }: { lesson: WritingLesson }) {
  const wordHint =
    lesson.minWords && lesson.maxWords
      ? `Aim for ${lesson.minWords}–${lesson.maxWords} words.`
      : lesson.minWords
        ? `Aim for at least ${lesson.minWords} words.`
        : lesson.maxWords
          ? `Aim for at most ${lesson.maxWords} words.`
          : null;
  return (
    <section className="mb-4 rounded-md border bg-muted/40 p-3 text-sm shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Topic
      </p>
      <p className="mt-0.5 text-sm font-semibold">{lesson.topic}</p>
      <p className="mt-2 italic">{lesson.prompt}</p>
      {wordHint && <p className="mt-2 text-xs text-muted-foreground">{wordHint}</p>}
    </section>
  );
}
