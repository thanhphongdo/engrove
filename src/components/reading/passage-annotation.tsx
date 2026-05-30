"use client";

import { useState } from "react";
import { Check, Plus, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSaveVocab } from "@/lib/db/use-vocab";
import { useSpeak } from "@/lib/use-speak";
import type { Annotation } from "@/lib/lessons/types";

export function PassageAnnotation({
  text,
  annotation,
  sourceLessonId,
}: {
  text: string;
  annotation: Annotation;
  sourceLessonId: string;
}) {
  const saveVocab = useSaveVocab();
  const { speak, state: speakState, supported: speakSupported } = useSpeak();
  const [saveState, setSaveState] = useState<"idle" | "saved" | "duplicate">("idle");

  async function handleSave() {
    const result = await saveVocab({
      phrase: annotation.phrase,
      meaningVi: annotation.meaningVi,
      pronunciation: annotation.pronunciation,
      exampleEn: annotation.exampleEn,
      sourceLessonId,
    });
    if (result.saved) {
      setSaveState("saved");
      toast.success(`"${annotation.phrase}" added to vocab`);
    } else if (result.reason === "duplicate") {
      setSaveState("duplicate");
      toast.info("Already in your vocab");
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="vocab-word cursor-help bg-transparent p-0 align-baseline text-inherit hover:text-emerald-700 dark:hover:text-emerald-300"
        >
          {text}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm">
        <div className="flex items-center gap-2">
          <p className="font-semibold">
            {annotation.phrase}
            {annotation.pronunciation && (
              <span className="ml-2 font-normal text-muted-foreground">
                {annotation.pronunciation}
              </span>
            )}
          </p>
          {speakSupported && (
            <button
              type="button"
              onClick={() => speak(annotation.phrase)}
              aria-label={`Listen to "${annotation.phrase}"`}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              disabled={speakState === "speaking"}
            >
              <Volume2 className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="mt-1 text-sm">{annotation.meaningVi}</p>
        {annotation.exampleEn && (
          <p className="mt-1 text-xs italic text-muted-foreground">{annotation.exampleEn}</p>
        )}
        <div className="mt-2 border-t pt-2">
          {saveState === "idle" ? (
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3" aria-hidden="true" />
              Save to vocab
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3 text-green-600" aria-hidden="true" />
              {saveState === "saved" ? "Saved" : "Already in vocab"}
            </span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
