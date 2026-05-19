import Fuse from "fuse.js";
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
      { name: "title", weight: 0.7 },
      { name: "summary", weight: 0.3 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    includeScore: false,
    minMatchCharLength: 2,
  });
}

export function searchLessons(
  lessons: readonly LessonMeta[],
  query: string,
  fuse: Fuse<LessonMeta>,
): LessonMeta[] {
  const q = query.trim();
  if (q === "") return lessons as LessonMeta[];
  return fuse.search(q).map((r) => r.item);
}
