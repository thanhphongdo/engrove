"use client";

import { Check, Lightbulb, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

export function QuizQuestion({ index, question, value, onChange, showHint, reviewMode }: QuizQuestionProps) {
  return (
    <div
      className={cn(
        "space-y-1.5 py-2.5 sm:space-y-2 sm:py-3",
        reviewMode &&
          value !== undefined &&
          (value === question.answerIndex
            ? "border-l-2 border-green-500/60 bg-green-500/5 pl-2"
            : "border-l-2 border-red-500/60 bg-red-500/5 pl-2"),
        reviewMode &&
          value === undefined &&
          "border-l-2 border-red-500/60 bg-red-500/5 pl-2",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">
          {index + 1}. {question.prompt}
        </p>
        {showHint && !reviewMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Show hint"
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
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
      <RadioGroup
        value={value === undefined ? "" : String(value)}
        onValueChange={(v) => onChange(Number(v))}
        disabled={reviewMode}
        className="gap-1! sm:gap-1.5!"
      >
        {question.options.map((opt, i) => {
          const id = `${question.id}-${i}`;
          const isCorrect = reviewMode && i === question.answerIndex;
          const isWrongPick = reviewMode && value === i && i !== question.answerIndex;
          return (
            <div
              key={id}
              className={cn(
                "flex items-center gap-2 rounded px-2 py-0.5 sm:py-1",
                isCorrect && "bg-green-500/10",
                isWrongPick && "bg-red-500/10",
              )}
            >
              <RadioGroupItem id={id} value={String(i)} />
              <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                {opt}
              </Label>
              {isCorrect && <Check className="ml-auto size-4 text-green-600" />}
              {isWrongPick && <X className="ml-auto size-4 text-red-600" />}
            </div>
          );
        })}
      </RadioGroup>
      {reviewMode && (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold">Explanation:</span> {question.explanation}
        </p>
      )}
    </div>
  );
}
