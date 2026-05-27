"use client";

import { Play } from "lucide-react";
import type { SpeakingLesson } from "@/lib/lessons/speaking-schema";

function playAudio(url: string) {
  new Audio(url).play().catch(console.error);
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
              <li key={v.id} className="rounded-md border bg-card p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{v.phrase}</span>
                  <button
                    type="button"
                    aria-label={`Play ${v.phrase}`}
                    onClick={() => playAudio(`${lesson.audio.cdnBase}/vocab/${v.id}.mp3`)}
                    className="shrink-0 rounded-full p-1 transition-colors hover:bg-accent"
                  >
                    <Play className="size-3 fill-current" aria-hidden="true" />
                  </button>
                </div>
                {v.pronunciation && <p className="mt-0.5 text-xs text-muted-foreground">{v.pronunciation}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground">{v.meaningVi}</p>
              </li>
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
