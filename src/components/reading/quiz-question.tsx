"use client";

import { Check, Lightbulb, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/lessons/types";

export type QuizQuestionProps = {
  index: number;
  question: Question;
  value: number | undefined;
  onChange: (v: number) => void;
  showHint: boolean;
  reviewMode: boolean;
};

const OPTION_BASE =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-default";

export function QuizQuestion({ index, question, value, onChange, showHint, reviewMode }: QuizQuestionProps) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {index + 1}. {question.prompt}
        </p>
        {showHint && !reviewMode && question.hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Show hint"
                className="grid size-7 shrink-0 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10"
              >
                <Lightbulb className="size-4" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs italic">
              {question.hint}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div role="radiogroup" className="space-y-1">
        {question.options.map((opt, i) => {
          const selected = value === i;
          const isCorrect = reviewMode && i === question.answerIndex;
          const isWrongPick = reviewMode && value === i && i !== question.answerIndex;
          const filled = selected || isCorrect || isWrongPick;

          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={reviewMode}
              onClick={() => onChange(i)}
              className={cn(
                OPTION_BASE,
                isCorrect
                  ? "bg-emerald-50 font-medium text-emerald-800 ring-1 ring-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
                  : isWrongPick
                    ? "bg-red-50 font-medium text-red-700 ring-1 ring-red-300 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30"
                    : selected
                      ? "bg-emerald-50 font-medium text-emerald-800 ring-1 ring-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
                      : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5",
              )}
            >
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full border-2",
                  isWrongPick
                    ? "border-red-400 dark:border-red-400"
                    : isCorrect || selected
                      ? "border-emerald-500 dark:border-emerald-400"
                      : "border-neutral-300 dark:border-neutral-600",
                )}
              >
                {filled && (
                  <span className={cn("size-2 rounded-full", isWrongPick ? "bg-red-400" : "bg-emerald-500 dark:bg-emerald-400")} />
                )}
              </span>
              <span className="flex-1">{opt}</span>
              {isCorrect && <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
              {isWrongPick && <X className="size-4 shrink-0 text-red-500" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {reviewMode && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold">Explanation:</span> {question.explanation}
        </p>
      )}
    </div>
  );
}
