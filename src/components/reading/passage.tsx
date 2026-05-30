"use client";

import { useMemo } from "react";
import { splitWithAnnotations } from "@/lib/lessons/annotate";
import { PassageAnnotation } from "./passage-annotation";
import type { Lesson } from "@/lib/lessons/types";

export function Passage({
  lesson,
  showAnnotations,
  showTranslation,
}: {
  lesson: Lesson;
  showAnnotations: boolean;
  showTranslation: boolean;
}) {
  const lines = useMemo<{ speaker?: string; text: string; key: string }[]>(() => {
    if (lesson.format === "paragraph") {
      return (lesson.body as string)
        .split(/\n+/)
        .map((line, i) => ({ text: line, key: `p${i}` }));
    }
    return (lesson.body as { speaker: string; text: string }[]).map((t, i) => ({
      speaker: t.speaker,
      text: t.text,
      key: `t${i}`,
    }));
  }, [lesson]);

  const translationLines = useMemo(() => {
    return lesson.translationVi.split(/\n+/).map((line, i) => {
      if (lesson.format === "dialogue") {
        const match = line.match(/^([^:]+):\s(.*)$/);
        if (match) return { speaker: match[1], text: match[2], key: `tr${i}` };
      }
      return { text: line, key: `tr${i}` };
    });
  }, [lesson]);

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Reading passage</h2>
      <article className="space-y-3 leading-[1.9] text-neutral-800 dark:text-neutral-200">
        {lines.map((line) => {
          const segments = showAnnotations
            ? splitWithAnnotations(line.text, lesson.annotations)
            : [{ kind: "text" as const, text: line.text }];
          return (
            <p key={line.key}>
              {line.speaker && (
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{line.speaker}: </span>
              )}
              {segments.map((seg, idx) =>
                seg.kind === "text" ? (
                  <span key={idx}>{seg.text}</span>
                ) : (
                  <PassageAnnotation
                    key={idx}
                    text={seg.text}
                    annotation={seg.annotation}
                    sourceLessonId={lesson.id}
                  />
                ),
              )}
            </p>
          );
        })}
      </article>
      {showTranslation && (
        <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-2.5 text-[0.8125rem] italic leading-relaxed text-neutral-400 dark:border-white/5 dark:text-neutral-500">
          {translationLines.map((line) => (
            <p key={line.key}>
              {line.speaker && (
                <span className="font-semibold not-italic text-neutral-500 dark:text-neutral-400">{line.speaker}: </span>
              )}
              {line.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
