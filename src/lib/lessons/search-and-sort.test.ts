import { describe, it, expect } from "vitest";
import {
  mulberry32,
  shuffle,
  sortLessons,
  buildFuse,
  searchLessons,
  normalizeRanges,
  buildHighlightMap,
} from "./search-and-sort";
import type { LessonMeta, CefrLevel } from "./types";

const lesson = (
  id: string,
  level: CefrLevel,
  title: string,
  summary = "",
  tags: string[] = [],
): LessonMeta => ({ id, level, title, summary, tags });

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });
});

describe("shuffle", () => {
  const input = [1, 2, 3, 4, 5];

  it("does not mutate the input array", () => {
    const copy = [...input];
    shuffle(input, mulberry32(7));
    expect(input).toEqual(copy);
  });

  it("returns a permutation of the input", () => {
    const out = shuffle(input, mulberry32(7));
    expect(out.slice().sort()).toEqual(input.slice().sort());
  });

  it("is deterministic for a given seed", () => {
    expect(shuffle(input, mulberry32(7))).toEqual(shuffle(input, mulberry32(7)));
  });
});

describe("sortLessons", () => {
  const lessons: LessonMeta[] = [
    lesson("c", "B1", "Chess club"),
    lesson("a", "A1", "Asking directions"),
    lesson("b", "A2", "Beach day"),
    lesson("d", "A1", "Afternoon tea"),
  ];

  it("sorts by name (locale-aware ascending)", () => {
    const out = sortLessons(lessons, "name", 0);
    expect(out.map((l) => l.title)).toEqual([
      "Afternoon tea",
      "Asking directions",
      "Beach day",
      "Chess club",
    ]);
  });

  it("sorts by level A1 -> C1 with title as tiebreaker", () => {
    const out = sortLessons(lessons, "level", 0);
    expect(out.map((l) => l.id)).toEqual(["d", "a", "b", "c"]);
  });

  it("sorts randomly and is deterministic given a seed", () => {
    const a = sortLessons(lessons, "random", 12345);
    const b = sortLessons(lessons, "random", 12345);
    expect(a).toEqual(b);
  });

  it("produces different orders for different seeds", () => {
    const a = sortLessons(lessons, "random", 1);
    const b = sortLessons(lessons, "random", 99999);
    expect(a).not.toEqual(b);
  });

  it("does not mutate the input list", () => {
    const copy = [...lessons];
    sortLessons(lessons, "name", 0);
    sortLessons(lessons, "level", 0);
    sortLessons(lessons, "random", 0);
    expect(lessons).toEqual(copy);
  });
});

describe("searchLessons", () => {
  const lessons: LessonMeta[] = [
    lesson("1", "A1", "Ordering coffee", "A short dialogue at a busy café."),
    lesson("2", "A1", "At the library", "Borrowing books and asking for help."),
    lesson("3", "A2", "Morning routine", "Daily habits and time expressions."),
    lesson("4", "B1", "Job interview", "Talking about strengths at work."),
  ];

  it("returns the input list unchanged for an empty query", () => {
    const fuse = buildFuse(lessons);
    expect(searchLessons(lessons, "", fuse)).toBe(lessons);
  });

  it("returns the input list unchanged for a whitespace-only query", () => {
    const fuse = buildFuse(lessons);
    expect(searchLessons(lessons, "   ", fuse)).toBe(lessons);
  });

  it("matches titles", () => {
    const fuse = buildFuse(lessons);
    const out = searchLessons(lessons, "coffee", fuse);
    expect(out.map((l) => l.id)).toContain("1");
  });

  it("matches summaries", () => {
    const fuse = buildFuse(lessons);
    const out = searchLessons(lessons, "borrowing", fuse);
    expect(out.map((l) => l.id)).toContain("2");
  });

  it("returns [] when nothing matches", () => {
    const fuse = buildFuse(lessons);
    expect(searchLessons(lessons, "zzznotapresentword", fuse)).toEqual([]);
  });

  it("ranks title hits above summary hits for the same term", () => {
    const seeded: LessonMeta[] = [
      lesson("s", "A1", "Cooking class", "A friendly intro to weekend coffee meetups."),
      lesson("t", "A1", "Coffee shop chat", "A short conversation at a bakery."),
    ];
    const fuse = buildFuse(seeded);
    const out = searchLessons(seeded, "coffee", fuse);
    expect(out[0].id).toBe("t");
  });

  it("tolerates a small typo", () => {
    const fuse = buildFuse(lessons);
    const out = searchLessons(lessons, "intervew", fuse); // missing 'i'
    expect(out.map((l) => l.id)).toContain("4");
  });
});

describe("searchLessons (tags)", () => {
  it("matches when the query appears only in a lesson's tags", () => {
    const lessons: LessonMeta[] = [
      lesson(
        "1",
        "A1",
        "Quiet evening",
        "A short text about staying in.",
        ["coffee", "relaxation"],
      ),
      lesson("2", "A1", "Daily walk", "A walk through the park.", ["exercise"]),
    ];
    const fuse = buildFuse(lessons);
    const out = searchLessons(lessons, "coffee", fuse);
    expect(out.map((l) => l.id)).toContain("1");
    expect(out.map((l) => l.id)).not.toContain("2");
  });
});

describe("normalizeRanges", () => {
  it("returns [] for an empty input", () => {
    expect(normalizeRanges([], 10)).toEqual([]);
  });

  it("passes a single in-bounds range through unchanged", () => {
    expect(normalizeRanges([[2, 5]], 10)).toEqual([[2, 5]]);
  });

  it("clamps end past textLength", () => {
    expect(normalizeRanges([[2, 20]], 10)).toEqual([[2, 10]]);
  });

  it("drops a range with start < 0", () => {
    expect(normalizeRanges([[-1, 4]], 10)).toEqual([]);
  });

  it("drops a range where start >= end after clamping", () => {
    expect(normalizeRanges([[5, 5]], 10)).toEqual([]);
    expect(normalizeRanges([[12, 15]], 10)).toEqual([]);
  });

  it("merges overlapping ranges", () => {
    expect(normalizeRanges([[2, 6], [4, 8]], 10)).toEqual([[2, 8]]);
  });

  it("merges adjacent ranges", () => {
    expect(normalizeRanges([[0, 3], [3, 5]], 10)).toEqual([[0, 5]]);
  });

  it("sorts unsorted input by start", () => {
    expect(normalizeRanges([[5, 7], [0, 2]], 10)).toEqual([[0, 2], [5, 7]]);
  });
});

describe("buildHighlightMap", () => {
  const lessons: LessonMeta[] = [
    lesson(
      "1",
      "A1",
      "Ordering coffee",
      "A short dialogue at a busy café.",
      ["coffee", "morning"],
    ),
    lesson(
      "2",
      "A1",
      "At the library",
      "Borrowing books and asking for help.",
      ["books", "help"],
    ),
    lesson(
      "3",
      "B1",
      "Job interview",
      "Talking about strengths at work.",
      ["careers"],
    ),
  ];

  it("returns an empty map for an empty query", () => {
    const fuse = buildFuse(lessons);
    expect(buildHighlightMap(fuse, "").size).toBe(0);
  });

  it("returns an empty map for a whitespace-only query", () => {
    const fuse = buildFuse(lessons);
    expect(buildHighlightMap(fuse, "   ").size).toBe(0);
  });

  it("omits lessons that did not match", () => {
    const fuse = buildFuse(lessons);
    const map = buildHighlightMap(fuse, "library");
    expect(map.has("2")).toBe(true);
    expect(map.has("1")).toBe(false);
    expect(map.has("3")).toBe(false);
  });

  it("partitions matches into title / summary / tag ranges", () => {
    const fuse = buildFuse(lessons);
    const map = buildHighlightMap(fuse, "coffee");
    const h = map.get("1");
    expect(h).toBeDefined();
    expect(h!.titleRanges.length).toBeGreaterThan(0);
    expect(h!.summaryRanges.length).toBe(0);
    expect(h!.tagRanges.get("coffee")).toBeDefined();
    expect(h!.tagRanges.get("coffee")!.length).toBeGreaterThan(0);
  });

  it("keys tagRanges by the exact tag string and stores ranges within that tag", () => {
    const fuse = buildFuse(lessons);
    const map = buildHighlightMap(fuse, "books");
    const h = map.get("2");
    expect(h).toBeDefined();
    expect(h!.tagRanges.has("books")).toBe(true);
    const ranges = h!.tagRanges.get("books")!;
    // "books" matched at start of the tag string "books"
    expect(ranges[0][0]).toBe(0);
    expect(ranges[0][1]).toBe(5);
  });
});
