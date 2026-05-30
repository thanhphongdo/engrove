"use client";

import Link from "next/link";
import { BookOpen, Headphones, Mic, PenLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useReadingLessonsIndex,
  useWritingLessonsIndex,
  useListeningLessonsIndex,
  useSpeakingLessonsIndex,
} from "@/lib/lessons/load";

type SkillCard = {
  href: string;
  label: string;
  icon: LucideIcon;
  tile: string;
  blurb: string;
  count: number | undefined;
};

/** "Four skills, one habit" — links to each hub with real lesson counts. */
export function SkillCards() {
  const reading = useReadingLessonsIndex();
  const listening = useListeningLessonsIndex();
  const speaking = useSpeakingLessonsIndex();
  const writing = useWritingLessonsIndex();

  const cards: SkillCard[] = [
    {
      href: "/reading",
      label: "Reading",
      icon: BookOpen,
      tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
      blurb: "Short stories & letters with Vietnamese help where you need it.",
      count: reading.data?.length,
    },
    {
      href: "/listening",
      label: "Listening",
      icon: Headphones,
      tile: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
      blurb: "Audio dialogues in native voices — listen, then reveal the script.",
      count: listening.data?.length,
    },
    {
      href: "/speaking",
      label: "Speaking",
      icon: Mic,
      tile: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
      blurb: "Real conversations — record your turns and play them back.",
      count: speaking.data?.length,
    },
    {
      href: "/writing",
      label: "Writing",
      icon: PenLine,
      tile: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
      blurb: "Prompts to draft your own answer and get AI feedback.",
      count: writing.data?.length,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 dark:border-white/10 dark:bg-neutral-900"
          >
            <span className={`grid size-11 place-items-center rounded-xl ${c.tile}`}>
              <Icon className="size-5.5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 font-semibold">{c.label}</h3>
            <p className="mt-1 text-sm text-neutral-500">{c.blurb}</p>
            <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {c.count != null ? `${c.count.toLocaleString()} lessons` : "Explore"} →
            </p>
          </Link>
        );
      })}
    </div>
  );
}
