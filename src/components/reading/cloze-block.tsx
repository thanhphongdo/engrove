"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { parseTemplate } from "@/lib/lessons/cloze-template";
import { useQuiz } from "./quiz-section";
import type { ClozeBlank } from "@/lib/lessons/types";

function BlankSelect({ blank }: { blank: ClozeBlank }) {
  const { clozePicks, setClozePick, reviewMode } = useQuiz();
  const value = clozePicks[blank.id];
  const correct = value === blank.answerIndex;

  if (reviewMode) {
    return (
      <span
        className={cn(
          "mx-0.5 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-sm font-medium",
          correct
            ? "border-green-500/60 bg-green-500/10 text-green-700 dark:text-green-300"
            : "border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-300",
        )}
      >
        {value === undefined ? "—" : blank.options[value]}
        {correct ? (
          <Check className="size-3" aria-hidden="true" />
        ) : (
          <X className="size-3" aria-hidden="true" />
        )}
      </span>
    );
  }

  return (
    <Select
      value={value === undefined ? "" : String(value)}
      onValueChange={(v) => setClozePick(blank.id, Number(v))}
    >
      <SelectTrigger
        size="sm"
        className="mx-0.5 inline-flex h-7 w-auto min-w-[7rem] py-0 align-baseline"
        aria-label={`Blank ${blank.id}`}
      >
        <SelectValue placeholder="…" />
      </SelectTrigger>
      <SelectContent>
        {blank.options.map((opt, i) => (
          <SelectItem key={i} value={String(i)}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ClozeBlock() {
  const { lesson } = useQuiz();
  const segments = useMemo(() => {
    if (!lesson.cloze) return [];
    try {
      return parseTemplate(lesson.cloze);
    } catch {
      return [];
    }
  }, [lesson.cloze]);

  if (!lesson.cloze) return null;

  const blankCount = lesson.cloze.blanks.length;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Fill in the blanks · {blankCount}</p>
      <div className="rounded-md border bg-card p-4 text-sm leading-loose">
        {segments.map((seg, i) =>
          seg.kind === "text" ? (
            <span key={i}>{seg.text}</span>
          ) : (
            <BlankSelect key={i} blank={seg.blank} />
          ),
        )}
      </div>
    </div>
  );
}
