"use client";

import { useEffect } from "react";
import { TranscriptPlayer } from "@/components/listening/transcript-player";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import type { SpeakingLesson } from "@/lib/lessons/speaking-schema";

type Props = { lesson: SpeakingLesson };

export function SampleListenTab({ lesson }: Props) {
  const load = useListeningAudioStore((s) => s.load);
  const stop = useListeningAudioStore((s) => s.stop);

  useEffect(() => {
    // Sentence URLs: {cdnBase}/sentences/{sentenceId}.mp3
    // The store generates: ${cdnBase}/${sentenceId}.mp3
    // So we pass cdnBase + "/sentences" to get the correct path.
    load(
      lesson.id,
      `${lesson.audio.cdnBase}/sentences`,
      lesson.sentences,
      lesson.audio.manifestVersion,
    );
    return () => stop();
  }, [lesson.id, lesson.audio.cdnBase, lesson.audio.manifestVersion, load, stop]);

  return (
    <div className="space-y-4">
      <TranscriptPlayer />
      {lesson.translationVi && (
        <details className="rounded-md border">
          <summary className="cursor-pointer px-4 py-2 text-sm font-medium">Vietnamese translation</summary>
          <div className="space-y-1 px-4 pb-3 pt-1 text-sm text-muted-foreground">
            {lesson.translationVi.split(/\n+/).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </details>
      )}
      {lesson.grammarNotes.length > 0 && (
        <div className="space-y-2">
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
