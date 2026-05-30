"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LevelBadge } from "@/components/shared/level-badge";
import { useLessonsIndexBySkill } from "@/lib/lessons/load";
import { SKILL_META, type Skill } from "@/lib/skills";

/**
 * Renders a lesson's tags as clickable chips. Clicking one opens a modal that
 * lists the other lessons in the same hub sharing that tag, so the learner can
 * jump to another lesson on the same topic.
 */
export function LessonTags({
  skill,
  tags,
  currentLessonId,
}: {
  skill: Skill;
  tags: string[];
  currentLessonId: string;
}) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  return (
    <>
      {tags.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setActiveTag(t)}
          className="rounded text-neutral-500 underline-offset-2 transition-colors hover:text-emerald-700 hover:underline dark:hover:text-emerald-300"
        >
          #{t}
        </button>
      ))}

      <Dialog open={activeTag != null} onOpenChange={(open) => !open && setActiveTag(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {SKILL_META[skill].label} · #{activeTag}
            </DialogTitle>
            <DialogDescription>Other lessons on this topic — pick one to jump to it.</DialogDescription>
          </DialogHeader>
          {activeTag && (
            <TagLessonList
              skill={skill}
              tag={activeTag}
              currentLessonId={currentLessonId}
              onNavigate={() => setActiveTag(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TagLessonList({
  skill,
  tag,
  currentLessonId,
  onNavigate,
}: {
  skill: Skill;
  tag: string;
  currentLessonId: string;
  onNavigate: () => void;
}) {
  const { data, isLoading } = useLessonsIndexBySkill(skill);

  const matches = useMemo(
    () => (data ?? []).filter((l) => l.id !== currentLessonId && l.tags.includes(tag)),
    [data, tag, currentLessonId],
  );

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>;
  }
  if (matches.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-500">No other lessons tagged #{tag} yet.</p>;
  }

  return (
    <ul className="-mx-1 max-h-[60vh] overflow-y-auto">
      {matches.map((l) => (
        <li key={l.id}>
          <Link
            href={`${SKILL_META[skill].href}/${l.id}`}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-neutral-100 dark:hover:bg-white/5"
          >
            <LevelBadge level={l.level} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
