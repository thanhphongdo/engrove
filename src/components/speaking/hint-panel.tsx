"use client";

import { useState } from "react";
import { Check, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { useSaveVocab } from "@/lib/db/use-vocab";
import type { HintVocab, SpeakingLesson } from "@/lib/lessons/speaking-schema";

function playAudio(url: string) {
  new Audio(url).play().catch(console.error);
}

type VocabItemProps = { v: HintVocab; lessonId: string; cdnBase: string };

function VocabItem({ v, lessonId, cdnBase }: VocabItemProps) {
  const saveVocab = useSaveVocab();
  const [saveState, setSaveState] = useState<"idle" | "saved" | "duplicate">("idle");

  async function handleSave() {
    const result = await saveVocab({
      phrase: v.phrase,
      meaningVi: v.meaningVi,
      pronunciation: v.pronunciation,
      sourceLessonId: lessonId,
    });
    if (result.saved) {
      setSaveState("saved");
      toast.success(`"${v.phrase}" added to vocab`);
    } else {
      setSaveState("duplicate");
      toast.info("Already in your vocab");
    }
  }

  return (
    <li className="rounded-md border bg-card p-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{v.phrase}</span>
        <div className="flex items-center gap-1">
          {saveState === "idle" ? (
            <div className="group relative">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3" aria-hidden="true" />
              </button>
              <span className="pointer-events-none absolute right-full top-1/2 mr-1.5 -translate-y-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                Save to vocab
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3 text-green-600" aria-hidden="true" />
              {saveState === "saved" ? "Saved" : "Already in vocab"}
            </span>
          )}
          <button
            type="button"
            aria-label={`Play ${v.phrase}`}
            onClick={() => playAudio(`${cdnBase}/vocab/${v.id}.mp3`)}
            className="shrink-0 rounded-full p-1 transition-colors hover:bg-accent"
          >
            <Play className="size-3 fill-current" aria-hidden="true" />
          </button>
        </div>
      </div>
      {v.pronunciation && <p className="mt-0.5 text-xs text-muted-foreground">{v.pronunciation}</p>}
      <p className="mt-0.5 text-xs text-muted-foreground">{v.meaningVi}</p>
    </li>
  );
}

type Props = { lesson: SpeakingLesson };

export function HintPanel({ lesson }: Props) {
  return (
    <div className="flex w-80 shrink-0 flex-col gap-6 overflow-y-auto">
      {/* Vocab */}
      {lesson.hintVocab.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vocabulary</h3>
          <ul className="space-y-2">
            {lesson.hintVocab.map((v) => (
              <VocabItem key={v.id} v={v} lessonId={lesson.id} cdnBase={lesson.audio.cdnBase} />
            ))}
          </ul>
        </section>
      )}

      {/* Starters */}
      {lesson.hintStarters.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Useful starters</h3>
          <ul className="space-y-2">
            {lesson.hintStarters.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border bg-card p-2 text-sm">
                <span>{s.text}</span>
                <button
                  type="button"
                  aria-label={`Play "${s.text}"`}
                  onClick={() => playAudio(`${lesson.audio.cdnBase}/starters/${s.id}.mp3`)}
                  className="shrink-0 rounded-full p-1 transition-colors hover:bg-accent"
                >
                  <Play className="size-3 fill-current" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Grammar */}
      {lesson.grammarNotes.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grammar notes</h3>
          <div className="space-y-2">
            {lesson.grammarNotes.map((note, i) => (
              <details key={i} className="rounded-md border bg-card">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium">{note.title}</summary>
                <div className="border-t px-3 py-2 text-xs">
                  <p className="text-muted-foreground">{note.bodyVi}</p>
                  <p className="mt-1">{note.bodyEn}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
