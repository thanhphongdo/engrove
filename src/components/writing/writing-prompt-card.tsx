"use client";

import { AccentBlock } from "@/components/lesson/accent-block";
import type { WritingLesson } from "@/lib/lessons/types";

export function WritingPromptCard({ lesson }: { lesson: WritingLesson }) {
  return (
    <AccentBlock className="mt-4" label="Prompt">
      <p className="text-neutral-800 dark:text-neutral-200">{lesson.prompt}</p>
    </AccentBlock>
  );
}
