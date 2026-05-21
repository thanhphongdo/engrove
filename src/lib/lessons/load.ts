"use client";

import { useQuery } from "@tanstack/react-query";
import {
  lessonSchema,
  lessonsIndexSchema,
  listeningLessonSchema,
  listeningLessonsIndexSchema,
  writingLessonSchema,
  writingLessonsIndexSchema,
} from "./schema";
import type {
  CefrLevel,
  Lesson,
  LessonMeta,
  ListeningLesson,
  ListeningLessonMeta,
  WritingLesson,
  WritingLessonMeta,
} from "./types";

type LessonKind = "reading" | "listening" | "writing";

function parseKindAndLevel(lessonId: string): { kind: LessonKind; level: CefrLevel } {
  const match = lessonId.match(/^(reading|listening|writing)-(a1|a2|b1|b2|c1)-/i);
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

async function fetchWritingIndex(): Promise<WritingLessonMeta[]> {
  const res = await fetch("/lessons/writing/index.json");
  if (!res.ok) throw new Error("Failed to load writing lessons index");
  return writingLessonsIndexSchema.parse(await res.json());
}

async function fetchWritingLesson(lessonId: string): Promise<WritingLesson> {
  const { level } = parseKindAndLevel(lessonId);
  const res = await fetch(`/lessons/writing/${level.toLowerCase()}/${lessonId}.json`);
  if (!res.ok) throw new Error(`Failed to load lesson ${lessonId}`);
  return writingLessonSchema.parse(await res.json());
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

export function useWritingLessonsIndex() {
  return useQuery({
    queryKey: ["lessons", "writing", "index"],
    queryFn: fetchWritingIndex,
    staleTime: Infinity,
  });
}

export function useWritingLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", "writing", "lesson", lessonId],
    queryFn: () => fetchWritingLesson(lessonId as string),
    staleTime: Infinity,
    enabled: Boolean(lessonId),
  });
}
