import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/lib/lessons/types";
import type { Attempt } from "@/lib/db/types";

const LEVEL_CLASS: Record<Lesson["level"], string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

export function LessonCard({ lesson, bestAttempt }: { lesson: Lesson; bestAttempt?: Attempt }) {
  return (
    <Link
      href={`/reading/${lesson.id}`}
      className="group block rounded-lg border bg-card p-4 text-card-foreground transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{lesson.title}</h3>
        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[0.7rem] font-semibold", LEVEL_CLASS[lesson.level])}>
          {lesson.level}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{lesson.summary}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-1 text-muted-foreground">
          {lesson.tags.slice(0, 3).map((t) => (
            <span key={t}>#{t}</span>
          ))}
          {lesson.tags.length > 3 && <span>+{lesson.tags.length - 3}</span>}
        </div>
        {bestAttempt ? (
          <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-medium text-secondary-foreground">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            Best {bestAttempt.score}/{bestAttempt.total}
          </span>
        ) : (
          <span className="text-muted-foreground">Not started</span>
        )}
      </div>
    </Link>
  );
}
