"use client";

import { useQuery } from "@tanstack/react-query";
import { lessonSchema, lessonsIndexSchema } from "./schema";
import type { CefrLevel, Lesson, LessonMeta } from "./types";

function parseLevelFromId(lessonId: string): CefrLevel {
  const match = lessonId.match(/^reading-(a1|a2|b1|b2|c1)-/i);
  if (!match) throw new Error(`Cannot derive level from lesson id: ${lessonId}`);
  return match[1].toUpperCase() as CefrLevel;
}

async function fetchLessonsIndex(): Promise<LessonMeta[]> {
  const res = await fetch("/lessons/reading/index.json");
  if (!res.ok) throw new Error("Failed to load lessons index");
  return lessonsIndexSchema.parse(await res.json());
}

async function fetchLessonById(lessonId: string): Promise<Lesson> {
  const level = parseLevelFromId(lessonId).toLowerCase();
  const res = await fetch(`/lessons/reading/${level}/${lessonId}.json`);
  if (!res.ok) throw new Error(`Failed to load lesson ${lessonId}`);
  return lessonSchema.parse(await res.json());
}

export function useReadingLessonsIndex() {
  return useQuery({
    queryKey: ["lessons", "reading", "index"],
    queryFn: fetchLessonsIndex,
    staleTime: Infinity,
  });
}

export function useReadingLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", "reading", "lesson", lessonId],
    queryFn: () => fetchLessonById(lessonId as string),
    staleTime: Infinity,
    enabled: Boolean(lessonId),
  });
}
