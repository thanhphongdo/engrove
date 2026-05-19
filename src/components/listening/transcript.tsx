"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Headphones } from "lucide-react";
import { SentenceRow } from "./sentence-row";
import { InlinePlaybackBar } from "./inline-playback-bar";
import type { ListeningLesson } from "@/lib/lessons/types";

export function Transcript({
  lesson,
  showAnnotations,
  showTranslation,
}: {
  lesson: ListeningLesson;
  showAnnotations: boolean;
  showTranslation: boolean;
}) {
  const [shown, setShown] = useState(false);
  const showSpeaker = lesson.format === "dialogue";
  const translationLines = lesson.translationVi.split(/\n+/);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <InlinePlaybackBar
          lessonId={lesson.id}
          cdnBase={lesson.audio.cdnBase}
          manifestVersion={lesson.audio.manifestVersion}
          sentences={lesson.sentences}
          totalDurationMs={lesson.totalDurationMs}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {shown ? (
            <>
              <ChevronUp className="size-3" /> Hide transcript
            </>
          ) : (
            <>
              <ChevronDown className="size-3" /> Show transcript
            </>
          )}
        </button>
      </div>

      {!shown ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <Headphones className="size-4" /> Listen first, then reveal the transcript.
        </div>
      ) : (
        <div className={showTranslation ? "grid grid-cols-1 gap-3 lg:grid-cols-2" : ""}>
          <article className="space-y-0 text-sm leading-relaxed">
            {lesson.sentences.map((s, i) => (
              <SentenceRow
                key={s.id}
                index={i}
                sentence={s}
                annotations={lesson.annotations}
                showAnnotations={showAnnotations}
                showSpeaker={showSpeaker}
                lessonId={lesson.id}
                cdnBase={lesson.audio.cdnBase}
                manifestVersion={lesson.audio.manifestVersion}
                allSentences={lesson.sentences}
              />
            ))}
          </article>
          {showTranslation && (
            <aside className="space-y-2 rounded-md bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
              {translationLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
