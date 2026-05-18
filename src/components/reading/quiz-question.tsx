"use client";

import { Check, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
        "space-y-2 rounded-md border p-3",
        reviewMode &&
          value !== undefined &&
          (value === question.answerIndex
            ? "border-green-500/50 bg-green-500/5"
            : "border-red-500/50 bg-red-500/5"),
        reviewMode && value === undefined && "border-red-500/50 bg-red-500/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">
          {index + 1}. {question.prompt}
        </p>
        {showHint && !reviewMode && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">💡 Hint</summary>
            <p className="mt-1 text-xs italic">{question.hint}</p>
          </details>
        )}
      </div>
      <RadioGroup
        value={value === undefined ? "" : String(value)}
        onValueChange={(v) => onChange(Number(v))}
        disabled={reviewMode}
        className="space-y-1"
      >
        {question.options.map((opt, i) => {
          const id = `${question.id}-${i}`;
          const isCorrect = reviewMode && i === question.answerIndex;
          const isWrongPick = reviewMode && value === i && i !== question.answerIndex;
          return (
            <div
              key={id}
              className={cn(
                "flex items-center gap-2 rounded px-2 py-1",
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
