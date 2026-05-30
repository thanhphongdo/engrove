"use client";

import { useState } from "react";
import { Check, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { DetailCard, CardHeading } from "@/components/lesson/detail-card";
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
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="font-semibold">{v.phrase}</p>
        {v.pronunciation && <p className="font-mono text-xs text-neutral-400">{v.pronunciation}</p>}
        <p className="text-xs text-neutral-500">{v.meaningVi}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-neutral-400">
        <button
          type="button"
          aria-label={`Play ${v.phrase}`}
          onClick={() => playAudio(`${cdnBase}/vocab/${v.id}.mp3`)}
          className="rounded-full p-1 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10"
        >
          <Play className="size-3.5 fill-current" aria-hidden="true" />
        </button>
        {saveState === "idle" ? (
          <button
            type="button"
            aria-label={`Add ${v.phrase} to vocab`}
            onClick={handleSave}
            className="rounded-full p-1 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <span
            className="grid size-6 place-items-center text-emerald-500"
            title={saveState === "saved" ? "Saved" : "Already in vocab"}
          >
            <Check className="size-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}

type Props = { lesson: SpeakingLesson };

export function HintPanel({ lesson }: Props) {
  return (
    <>
      {/* Vocab */}
      {lesson.hintVocab.length > 0 && (
        <DetailCard>
          <CardHeading className="mb-2">Vocabulary</CardHeading>
          <div className="space-y-2 text-sm">
            {lesson.hintVocab.map((v, i) => (
              <div key={v.id}>
                {i > 0 && <div className="mb-2 h-px bg-neutral-100 dark:bg-white/10" />}
                <VocabItem v={v} lessonId={lesson.id} cdnBase={lesson.audio.cdnBase} />
              </div>
            ))}
          </div>
        </DetailCard>
      )}

      {/* Starters */}
      {lesson.hintStarters.length > 0 && (
        <DetailCard>
          <CardHeading className="mb-2">Useful starters</CardHeading>
          <div className="space-y-1.5 text-sm">
            {lesson.hintStarters.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <span>{s.text}</span>
                <button
                  type="button"
                  aria-label={`Play "${s.text}"`}
                  onClick={() => playAudio(`${lesson.audio.cdnBase}/starters/${s.id}.mp3`)}
                  className="shrink-0 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10"
                >
                  <Play className="size-3.5 fill-current" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </DetailCard>
      )}

      {/* Grammar */}
      {lesson.grammarNotes.map((note, i) => (
        <details
          key={i}
          className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-white/10 dark:bg-neutral-900"
        >
          <summary className="cursor-pointer font-semibold text-neutral-700 dark:text-neutral-200">
            {note.title}
          </summary>
          <p className="mt-2 text-neutral-500">{note.bodyVi}</p>
          <p className="mt-1 text-neutral-700 dark:text-neutral-300">{note.bodyEn}</p>
        </details>
      ))}
    </>
  );
}
