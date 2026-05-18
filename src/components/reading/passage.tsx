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
  const lines = useMemo<{ original: string; key: string }[]>(() => {
    if (lesson.format === "paragraph") {
      return (lesson.body as string)
        .split(/\n+/)
        .map((line, i) => ({ original: line, key: `p${i}` }));
    }
    return (lesson.body as { speaker: string; text: string }[]).map((t, i) => ({
      original: `${t.speaker}: ${t.text}`,
      key: `t${i}`,
    }));
  }, [lesson]);

  return (
    <div className={showTranslation ? "grid grid-cols-1 gap-3 lg:grid-cols-2" : ""}>
      <article className="space-y-3 text-sm leading-relaxed">
        {lines.map((line) => {
          const segments = showAnnotations
            ? splitWithAnnotations(line.original, lesson.annotations)
            : [{ kind: "text" as const, text: line.original }];
          return (
            <p key={line.key}>
              {segments.map((seg, idx) =>
                seg.kind === "text" ? (
                  <span key={idx}>{seg.text}</span>
                ) : (
                  <PassageAnnotation key={idx} text={seg.text} annotation={seg.annotation} />
                ),
              )}
            </p>
          );
        })}
      </article>
      {showTranslation && (
        <aside className="space-y-3 rounded-md bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
          {lesson.translationVi.split(/\n+/).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </aside>
      )}
    </div>
  );
}
