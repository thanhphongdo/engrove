"use client";

import { useEffect, useMemo, useRef } from "react";
import { Volume2 } from "lucide-react";
import { TranscriptPlayer } from "@/components/listening/transcript-player";
import { PassageAnnotation } from "@/components/reading/passage-annotation";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { usePreferences } from "@/lib/db/use-preferences";
import { splitWithAnnotations } from "@/lib/lessons/annotate";
import { cn } from "@/lib/utils";
import type { SpeakingLesson, SpeakingSentence } from "@/lib/lessons/speaking-schema";

type Props = { lesson: SpeakingLesson; role: string };

type Turn = {
  text: string;
  speaker: string;
  translationVi?: string;
  startIdx: number; // first sentence index of this turn
  endIdx: number;   // one past the last sentence index
};

/** Group sentences under their dialogue turn (same sequential match as the practice view). */
function buildTurns(lesson: SpeakingLesson): Turn[] {
  const turns: Turn[] = [];
  let si = 0;
  for (const turn of lesson.body) {
    const startIdx = si;
    const acc: string[] = [];
    const group: SpeakingSentence[] = [];
    while (si < lesson.sentences.length && lesson.sentences[si].speaker === turn.speaker) {
      acc.push(lesson.sentences[si].text);
      group.push(lesson.sentences[si]);
      si++;
      if (acc.join(" ").trim() === turn.text.trim()) break;
    }
    const vi = group.map((s) => s.translationVi ?? "").filter(Boolean).join(" ");
    turns.push({ text: turn.text, speaker: turn.speaker, translationVi: vi || undefined, startIdx, endIdx: si });
  }
  return turns;
}

export function SampleListenTab({ lesson, role }: Props) {
  const load = useListeningAudioStore((s) => s.load);
  const stop = useListeningAudioStore((s) => s.stop);
  const cueTo = useListeningAudioStore((s) => s.cueTo);
  const concatOffsetsMs = useListeningAudioStore((s) => s.concatOffsetsMs);
  const currentLessonId = useListeningAudioStore((s) => s.lessonId);
  const currentIndex = useListeningAudioStore((s) => s.currentIndex);
  const status = useListeningAudioStore((s) => s.status);
  const prefs = usePreferences();
  const showTranslation = prefs.hintToggles.passageTranslation;
  const showAnnotations = prefs.hintToggles.vocabVi;

  const cdnBase = `${lesson.audio.cdnBase}/sentences`;
  const turns = useMemo(() => buildTurns(lesson), [lesson]);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  // Prefix sum of sentence durations — fallback offsets until the concat track is built.
  const durationOffsets = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const s of lesson.sentences) {
      out.push(acc);
      acc += s.durationMs ?? 0;
    }
    out.push(acc); // total at [length]
    return out;
  }, [lesson.sentences]);

  useEffect(() => {
    load(lesson.id, cdnBase, lesson.sentences, lesson.audio.manifestVersion);
    return () => stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, lesson.audio.cdnBase, lesson.audio.manifestVersion]);

  // Stop any in-progress per-line preview on unmount.
  useEffect(() => () => stopPreview(), []);

  function offsetMs(sentenceIdx: number): number {
    return concatOffsetsMs[sentenceIdx] ?? durationOffsets[sentenceIdx] ?? 0;
  }

  function stopPreview() {
    if (previewRef.current) {
      previewRef.current.onended = null;
      previewRef.current.pause();
      previewRef.current = null;
    }
  }

  function playTurn(turn: Turn) {
    stopPreview();
    // Cue the Play-all scrubber to this line (timer reflects play-all)...
    cueTo(lesson.id, cdnBase, lesson.sentences, offsetMs(turn.startIdx), lesson.audio.manifestVersion);
    // ...but play the original per-sentence audio for accurate pronunciation
    // (the mixed track can drift a few ms at boundaries).
    const ids = lesson.sentences.slice(turn.startIdx, turn.endIdx).map((s) => s.id);
    let i = 0;
    const playNext = () => {
      if (i >= ids.length) { previewRef.current = null; return; }
      const a = new Audio(`${cdnBase}/${ids[i]}.mp3?v=${lesson.audio.manifestVersion}`);
      previewRef.current = a;
      const advance = () => { if (previewRef.current === a) { i++; playNext(); } };
      a.onended = advance;
      a.onerror = advance;
      a.play().catch(advance);
    };
    playNext();
  }

  const isOurLesson = currentLessonId === lesson.id;

  return (
    <div className="space-y-4">
      <TranscriptPlayer />

      <div className="space-y-3">
        {turns.map((turn, i) => {
          const isUser = turn.speaker === role;
          const isPlaying =
            isOurLesson && status !== "idle" && currentIndex >= turn.startIdx && currentIndex < turn.endIdx;
          const segments = showAnnotations
            ? splitWithAnnotations(turn.text, lesson.annotations)
            : [{ kind: "text" as const, text: turn.text }];

          return (
            <div
              key={i}
              className={cn("flex max-w-[85%] gap-2.5", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}
            >
              <div
                className={cn(
                  "mt-5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm",
                  isUser ? "bg-primary/15" : "bg-muted",
                )}
                aria-hidden="true"
              >
                {isUser ? "🙋" : "🧑‍💼"}
              </div>
              <div className={cn("flex min-w-0 flex-col", isUser && "items-end")}>
                <span className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {turn.speaker}
                </span>
                <div
                  className={cn(
                    "group flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed transition-shadow",
                    isUser ? "bg-primary/10" : "bg-muted",
                    isPlaying && "ring-2 ring-primary",
                  )}
                >
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => playTurn(turn)}
                      aria-label="Play this line"
                      className="mt-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Volume2 className="size-4" aria-hidden="true" />
                    </button>
                  )}
                  <span>
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
                    {showTranslation && turn.translationVi && (
                      <span className="mt-1 block text-xs text-muted-foreground">{turn.translationVi}</span>
                    )}
                  </span>
                  {isUser && (
                    <button
                      type="button"
                      onClick={() => playTurn(turn)}
                      aria-label="Play this line"
                      className="mt-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Volume2 className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
