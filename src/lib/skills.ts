import { BookOpen, Headphones, PenLine, Mic } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Skill = "reading" | "listening" | "writing" | "speaking";

export const SKILL_META: Record<Skill, { label: string; icon: LucideIcon; href: string }> = {
  reading: { label: "Reading", icon: BookOpen, href: "/reading" },
  listening: { label: "Listening", icon: Headphones, href: "/listening" },
  writing: { label: "Writing", icon: PenLine, href: "/writing" },
  speaking: { label: "Speaking", icon: Mic, href: "/speaking" },
};

/** Lesson ids are `${skill}-${level}-NNN` (e.g. "reading-a1-001"). */
export function skillFromLessonId(id: string): Skill {
  const prefix = id.split("-")[0];
  if (prefix === "listening" || prefix === "writing" || prefix === "speaking") return prefix;
  return "reading";
}

export function hrefForLesson(id: string): string {
  return `/${skillFromLessonId(id)}/${id}`;
}
