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

function BlankSelect({ blank, index }: { blank: ClozeBlank; index: number }) {
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
        <span
          className={cn(
            "text-[10px] font-semibold tabular-nums",
            correct
              ? "text-green-600/80 dark:text-green-400/80"
              : "text-red-600/80 dark:text-red-400/80",
          )}
        >
          {index}.
        </span>
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
  const isDialogue = lesson.format === "dialogue";
  const blankIndexById = new Map(
    lesson.cloze.blanks.map((b, i) => [b.id, i + 1] as const),
  );

  const nodes: ReactNode[] = [];
  let atLineStart = true;
  segments.forEach((seg, i) => {
    if (seg.kind === "blank") {
      nodes.push(
        <BlankSelect
          key={`b${i}`}
          blank={seg.blank}
          index={blankIndexById.get(seg.blank.id) ?? 0}
        />,
      );
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
    <div className="space-y-2 sm:space-y-3">
      <p className="text-sm font-semibold">Fill in the blanks · {blankCount}</p>
      <div className="whitespace-pre-line text-sm leading-[2.5]">
        {nodes}
      </div>
    </div>
  );
}
