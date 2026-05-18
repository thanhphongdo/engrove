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
    <div className={showTranslation ? "grid grid-cols-1 gap-3 lg:grid-cols-2" : ""}>
      <article className="space-y-3 text-sm leading-relaxed">
        {lines.map((line) => {
          const segments = showAnnotations
            ? splitWithAnnotations(line.text, lesson.annotations)
            : [{ kind: "text" as const, text: line.text }];
          return (
            <p key={line.key}>
              {line.speaker && (
                <span className="font-semibold text-foreground">{line.speaker}: </span>
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
        <aside className="space-y-3 rounded-md bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
          {translationLines.map((line) => (
            <p key={line.key}>
              {line.speaker && (
                <span className="font-semibold text-foreground">{line.speaker}: </span>
              )}
              {line.text}
            </p>
          ))}
        </aside>
      )}
    </div>
  );
}
