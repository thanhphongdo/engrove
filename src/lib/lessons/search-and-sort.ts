import Fuse, { type FuseResult } from "fuse.js";
import type { CefrLevel, LessonMeta } from "./types";

export type SortBy = "name" | "level" | "random";

export const SORT_OPTIONS: readonly SortBy[] = ["name", "level", "random"] as const;

const LEVEL_RANK: Record<CefrLevel, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
};

const collator = new Intl.Collator(undefined, { sensitivity: "base" });

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sortLessons(
  lessons: readonly LessonMeta[],
  sortBy: SortBy,
  seed: number,
): LessonMeta[] {
  if (sortBy === "name") {
    return lessons.slice().sort((a, b) => collator.compare(a.title, b.title));
  }
  if (sortBy === "level") {
    return lessons.slice().sort((a, b) => {
      const d = LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
      return d !== 0 ? d : collator.compare(a.title, b.title);
    });
  }
  return shuffle(lessons, mulberry32(seed));
}

export function buildFuse(lessons: readonly LessonMeta[]): Fuse<LessonMeta> {
  return new Fuse(lessons.slice(), {
    keys: [
      { name: "title", weight: 0.5 },
      { name: "summary", weight: 0.25 },
      { name: "tags", weight: 0.25 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    includeScore: false,
    includeMatches: true,
    minMatchCharLength: 2,
  });
}

function runSearch(
  fuse: Fuse<LessonMeta>,
  query: string,
): readonly FuseResult<LessonMeta>[] {
  const q = query.trim();
  if (q === "") return [];
  return fuse.search(q);
}

export function searchLessons(
  lessons: readonly LessonMeta[],
  query: string,
  fuse: Fuse<LessonMeta>,
): LessonMeta[] {
  if (query.trim() === "") return lessons as LessonMeta[];
  return runSearch(fuse, query).map((r) => r.item);
}

export type LessonHighlight = {
  titleRanges: ReadonlyArray<readonly [number, number]>;
  summaryRanges: ReadonlyArray<readonly [number, number]>;
  tagRanges: ReadonlyMap<string, ReadonlyArray<readonly [number, number]>>;
};

export function buildHighlightMap(
  fuse: Fuse<LessonMeta>,
  query: string,
): Map<string, LessonHighlight> {
  const map = new Map<string, LessonHighlight>();
  const results = runSearch(fuse, query);
  for (const r of results) {
    const titleRanges: Array<readonly [number, number]> = [];
    const summaryRanges: Array<readonly [number, number]> = [];
    const tagRanges = new Map<string, Array<readonly [number, number]>>();
    for (const m of r.matches ?? []) {
      const indices = m.indices.map(
        ([s, e]) => [s, e + 1] as readonly [number, number],
      );
      if (m.key === "title") {
        titleRanges.push(...indices);
      } else if (m.key === "summary") {
        summaryRanges.push(...indices);
      } else if (m.key === "tags" && typeof m.value === "string") {
        const existing = tagRanges.get(m.value) ?? [];
        existing.push(...indices);
        tagRanges.set(m.value, existing);
      }
    }
    map.set(r.item.id, { titleRanges, summaryRanges, tagRanges });
  }
  return map;
}

export function normalizeRanges(
  ranges: ReadonlyArray<readonly [number, number]>,
  textLength: number,
): ReadonlyArray<readonly [number, number]> {
  const clamped: Array<readonly [number, number]> = [];
  for (const [start, rawEnd] of ranges) {
    if (start < 0) continue;
    const end = Math.min(rawEnd, textLength);
    if (start >= end) continue;
    clamped.push([start, end]);
  }
  clamped.sort((a, b) => a[0] - b[0]);
  const merged: Array<readonly [number, number]> = [];
  for (const r of clamped) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) {
      merged[merged.length - 1] = [last[0], Math.max(last[1], r[1])];
    } else {
      merged.push(r);
    }
  }
  return merged;
}
