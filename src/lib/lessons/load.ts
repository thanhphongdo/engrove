"use client";

import { useQuery } from "@tanstack/react-query";
import { lessonsFileSchema } from "./schema";
import type { CefrLevel, Lesson } from "./types";

const LEVELS: readonly CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"] as const;

async function fetchLessonsForLevel(level: CefrLevel): Promise<Lesson[]> {
  const res = await fetch(`/lessons/reading/${level.toLowerCase()}.json`);
  if (!res.ok) throw new Error(`Failed to load lessons for ${level}`);
  const json = await res.json();
  return lessonsFileSchema.parse(json);
}

export function useReadingLessons(level: CefrLevel) {
  return useQuery({
    queryKey: ["lessons", "reading", level],
    queryFn: () => fetchLessonsForLevel(level),
    staleTime: Infinity,
  });
}

export function useAllReadingLessons() {
  return useQuery({
    queryKey: ["lessons", "reading", "all"],
    queryFn: async () => {
      const all = await Promise.all(LEVELS.map(fetchLessonsForLevel));
      return all.flat();
    },
    staleTime: Infinity,
  });
}
