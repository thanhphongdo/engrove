"use client";

import { useMemo, Fragment, type ReactNode } from "react";
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

function renderDialogueText(text: string, atLineStart: boolean, keyBase: string): ReactNode {
  const pieces = text.split("\n");
  return (
    <>
      {pieces.map((piece, pi) => {
        const lineStart = pi === 0 ? atLineStart : true;
        const speakerMatch = lineStart ? piece.match(/^([^:\n]{1,40}):\s/) : null;
        return (
          <Fragment key={`${keyBase}-${pi}`}>
            {pi > 0 && "\n"}
            {speakerMatch ? (
              <>
                <span className="font-semibold text-foreground">
                  {speakerMatch[1]}:
                </span>
                {piece.slice(speakerMatch[1].length + 1)}
              </>
            ) : (
              piece
            )}
          </Fragment>
        );
      })}
    </>
  );
}

function BlankSelect({ blank }: { blank: ClozeBlank }) {
  const { clozePicks, setClozePick, reviewMode } = useQuiz();
  const value = clozePicks[blank.id];
  const correct = value === blank.answerIndex;

  if (reviewMode) {
    return (
      <span
        className={cn(
          "mx-1 inline-flex items-center gap-1 rounded border-b-2 px-2 py-0.5 text-center text-sm font-medium",
          correct
            ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
        )}
      >
        {value === undefined ? "—" : blank.options[value]}
        {correct ? <Check className="size-3" aria-hidden="true" /> : <X className="size-3" aria-hidden="true" />}
      </span>
    );
  }

  const filled = value !== undefined;
  return (
    <Select
      value={value === undefined ? "" : String(value)}
      onValueChange={(v) => setClozePick(blank.id, Number(v))}
    >
      <SelectTrigger
        size="sm"
        aria-label={`Blank ${blank.id}`}
        className={cn(
          "mx-1 inline-flex h-auto w-auto justify-center rounded border-b-2 px-2 py-0.5 align-baseline text-center [&>svg]:hidden",
          filled
            ? "min-w-20 border-emerald-400 bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "min-w-16 border-neutral-300 bg-white text-xs italic text-neutral-400 dark:border-white/20 dark:bg-white/5",
        )}
      >
        <SelectValue placeholder="answer" />
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
  const isDialogue = lesson.format === "dialogue";

  const nodes: ReactNode[] = [];
  let atLineStart = true;
  segments.forEach((seg, i) => {
    if (seg.kind === "blank") {
      nodes.push(<BlankSelect key={`b${i}`} blank={seg.blank} />);
      atLineStart = false;
      return;
    }
    nodes.push(
      <Fragment key={`t${i}`}>
        {isDialogue
          ? renderDialogueText(seg.text, atLineStart, `t${i}`)
          : seg.text}
      </Fragment>,
    );
    atLineStart = seg.text.endsWith("\n");
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Fill in the blanks</h2>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">{blankCount} blanks</span>
      </div>
      <div className="rounded-xl bg-neutral-100/60 px-4 py-4 dark:bg-white/5">
        <p className="whitespace-pre-line text-sm leading-loose text-neutral-800 dark:text-neutral-200">{nodes}</p>
        <p className="mt-2 border-l-4 border-emerald-400 pl-3 text-[0.75rem] italic text-neutral-400 dark:text-neutral-500">
          Complete all blanks to earn full cloze credit.
        </p>
      </div>
    </section>
  );
}
