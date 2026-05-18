import type { ClozeBlank, ClozeQuiz } from "./types";

export type ClozeSegment =
  | { kind: "text"; text: string }
  | { kind: "blank"; blank: ClozeBlank };

const PLACEHOLDER = /\{\{([^}]+)\}\}/g;

/** Returns the list of placeholder IDs in the order they appear in `template`. */
export function extractPlaceholderIds(template: string): string[] {
  const ids: string[] = [];
  for (const match of template.matchAll(PLACEHOLDER)) {
    ids.push(match[1].trim());
  }
  return ids;
}

/**
 * Splits the template into alternating text and blank segments.
 * Throws if any `{{id}}` placeholder has no matching blank.
 * Throws if any `blanks[i].id` does not appear as a placeholder.
 * Throws if a placeholder ID appears more than once in the template.
 */
export function parseTemplate(cloze: ClozeQuiz): ClozeSegment[] {
  const byId = new Map<string, ClozeBlank>();
  for (const b of cloze.blanks) {
    if (byId.has(b.id)) {
      throw new Error(`Duplicate cloze blank id: ${b.id}`);
    }
    byId.set(b.id, b);
  }

  const placeholderIds = extractPlaceholderIds(cloze.template);
  const seen = new Set<string>();
  for (const id of placeholderIds) {
    if (seen.has(id)) {
      throw new Error(`Duplicate placeholder in cloze template: {{${id}}}`);
    }
    seen.add(id);
    if (!byId.has(id)) {
      throw new Error(`Placeholder {{${id}}} has no matching blank`);
    }
  }
  for (const b of cloze.blanks) {
    if (!seen.has(b.id)) {
      throw new Error(`Blank "${b.id}" is not referenced in the template`);
    }
  }

  const segments: ClozeSegment[] = [];
  let cursor = 0;
  const matches = [...cloze.template.matchAll(PLACEHOLDER)];
  for (const m of matches) {
    const start = m.index ?? 0;
    if (start > cursor) {
      segments.push({ kind: "text", text: cloze.template.slice(cursor, start) });
    }
    const blank = byId.get(m[1].trim());
    if (blank) segments.push({ kind: "blank", blank });
    cursor = start + m[0].length;
  }
  if (cursor < cloze.template.length) {
    segments.push({ kind: "text", text: cloze.template.slice(cursor) });
  }
  return segments;
}
