"use client";

import { useEffect } from "react";
import { TranscriptPlayer } from "@/components/listening/transcript-player";
import { PassageAnnotation } from "@/components/reading/passage-annotation";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { usePreferences } from "@/lib/db/use-preferences";
import { splitWithAnnotations } from "@/lib/lessons/annotate";
import { cn } from "@/lib/utils";
import type { SpeakingLesson } from "@/lib/lessons/speaking-schema";

type Props = { lesson: SpeakingLesson };

export function SampleListenTab({ lesson }: Props) {
  const load = useListeningAudioStore((s) => s.load);
  const stop = useListeningAudioStore((s) => s.stop);
  const prefs = usePreferences();
  const showTranslation = prefs.hintToggles.passageTranslation;
  const showAnnotations = prefs.hintToggles.vocabVi;

  const cdnBase = `${lesson.audio.cdnBase}/sentences`;

  useEffect(() => {
    load(lesson.id, cdnBase, lesson.sentences, lesson.audio.manifestVersion);
    return () => stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, lesson.audio.cdnBase, lesson.audio.manifestVersion]);

  return (
    <div className="space-y-4">
      <TranscriptPlayer />

      <div className="space-y-0.5">
        {lesson.sentences.map((sentence, i) => {
          const prevSpeaker = i > 0 ? lesson.sentences[i - 1].speaker : null;
          const speakerChanged = sentence.speaker !== prevSpeaker;
          const segments = showAnnotations
            ? splitWithAnnotations(sentence.text, lesson.annotations)
            : [{ kind: "text" as const, text: sentence.text }];

          return (
            <div key={sentence.id} className={cn("text-sm", speakerChanged && i > 0 && "mt-3")}>
              <p className="leading-relaxed">
                {speakerChanged && (
                  <span className="font-semibold">{sentence.speaker}: </span>
                )}
                {segments.map((seg, j) =>
                  seg.kind === "text" ? (
                    <span key={j}>{seg.text}</span>
                  ) : (
                    <PassageAnnotation
                      key={j}
                      text={seg.text}
                      annotation={seg.annotation}
                      sourceLessonId={lesson.id}
                    />
                  ),
                )}
              </p>
              {showTranslation && sentence.translationVi && (
                <p className="mt-0.5 text-xs text-muted-foreground">{sentence.translationVi}</p>
              )}
            </div>
          );
        })}
      </div>

      {lesson.grammarNotes.length > 0 && (
        <div className="space-y-2 pt-2">
          {lesson.grammarNotes.map((note, i) => (
            <details key={i} className="rounded-md border">
              <summary className="cursor-pointer px-4 py-2 text-sm font-medium">{note.title}</summary>
              <div className="px-4 pb-3 pt-1 text-sm">
                <p className="text-muted-foreground">{note.bodyVi}</p>
                <p className="mt-1">{note.bodyEn}</p>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
