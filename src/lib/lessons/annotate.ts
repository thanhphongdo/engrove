import type { Annotation } from "./types";

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "annotation"; text: string; annotation: Annotation };

export function splitWithAnnotations(
  text: string,
  annotations: Annotation[],
): Segment[] {
  if (annotations.length === 0) return [{ kind: "text", text }];

  const sorted = [...annotations].sort((a, b) => b.phrase.length - a.phrase.length);

  type Match = { start: number; end: number; annotation: Annotation };
  const matches: Match[] = [];

  for (const anno of sorted) {
    let from = 0;
    while (true) {
      const idx = text.indexOf(anno.phrase, from);
      if (idx === -1) break;
      const end = idx + anno.phrase.length;
      const overlaps = matches.some(
        (m) => !(end <= m.start || idx >= m.end),
      );
      if (!overlaps) matches.push({ start: idx, end, annotation: anno });
      from = end;
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, m.start) });
    }
    segments.push({
      kind: "annotation",
      text: text.slice(m.start, m.end),
      annotation: m.annotation,
    });
    cursor = m.end;
  }
  if (cursor < text.length) {
    segments.push({ kind: "text", text: text.slice(cursor) });
  }
  return segments;
}
