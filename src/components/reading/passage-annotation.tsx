"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Annotation } from "@/lib/lessons/types";

export function PassageAnnotation({ text, annotation }: { text: string; annotation: Annotation }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-help rounded bg-yellow-200/60 px-0.5 underline decoration-dotted underline-offset-2 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/70"
        >
          {text}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm">
        <p className="font-semibold">
          {annotation.phrase}
          {annotation.pronunciation && (
            <span className="ml-2 font-normal text-muted-foreground">{annotation.pronunciation}</span>
          )}
        </p>
        <p className="mt-1 text-sm">{annotation.meaningVi}</p>
        {annotation.exampleEn && <p className="mt-1 text-xs italic text-muted-foreground">{annotation.exampleEn}</p>}
      </PopoverContent>
    </Popover>
  );
}
