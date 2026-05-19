"use client";

import { useQuery } from "@tanstack/react-query";
import {
  lessonSchema,
  lessonsIndexSchema,
  listeningLessonSchema,
  listeningLessonsIndexSchema,
} from "./schema";
import type {
  CefrLevel,
  Lesson,
  LessonMeta,
  ListeningLesson,
  ListeningLessonMeta,
} from "./types";

type LessonKind = "reading" | "listening";

function parseKindAndLevel(lessonId: string): { kind: LessonKind; level: CefrLevel } {
  const match = lessonId.match(/^(reading|listening)-(a1|a2|b1|b2|c1)-/i);
  if (!match) throw new Error(`Cannot derive kind/level from lesson id: ${lessonId}`);
  return {
    kind: match[1].toLowerCase() as LessonKind,
    level: match[2].toUpperCase() as CefrLevel,
  };
}

async function fetchReadingIndex(): Promise<LessonMeta[]> {
  const res = await fetch("/lessons/reading/index.json");
  if (!res.ok) throw new Error("Failed to load reading lessons index");
  return lessonsIndexSchema.parse(await res.json());
}

async function fetchReadingLesson(lessonId: string): Promise<Lesson> {
  const { level } = parseKindAndLevel(lessonId);
  const res = await fetch(`/lessons/reading/${level.toLowerCase()}/${lessonId}.json`);
  if (!res.ok) throw new Error(`Failed to load lesson ${lessonId}`);
  return lessonSchema.parse(await res.json());
}

async function fetchListeningIndex(): Promise<ListeningLessonMeta[]> {
  const res = await fetch("/lessons/listening/index.json");
  if (!res.ok) throw new Error("Failed to load listening lessons index");
  return listeningLessonsIndexSchema.parse(await res.json());
}

async function fetchListeningLesson(lessonId: string): Promise<ListeningLesson> {
  const { level } = parseKindAndLevel(lessonId);
  const res = await fetch(`/lessons/listening/${level.toLowerCase()}/${lessonId}.json`);
  if (!res.ok) throw new Error(`Failed to load lesson ${lessonId}`);
  return listeningLessonSchema.parse(await res.json());
}

export function useReadingLessonsIndex() {
  return useQuery({
    queryKey: ["lessons", "reading", "index"],
    queryFn: fetchReadingIndex,
    staleTime: Infinity,
  });
}

export function useReadingLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", "reading", "lesson", lessonId],
    queryFn: () => fetchReadingLesson(lessonId as string),
    staleTime: Infinity,
    enabled: Boolean(lessonId),
  });
}

export function useListeningLessonsIndex() {
  return useQuery({
    queryKey: ["lessons", "listening", "index"],
    queryFn: fetchListeningIndex,
    staleTime: Infinity,
  });
}

export function useListeningLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", "listening", "lesson", lessonId],
    queryFn: () => fetchListeningLesson(lessonId as string),
    staleTime: Infinity,
    enabled: Boolean(lessonId),
  });
}
