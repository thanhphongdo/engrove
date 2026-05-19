"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pin, PinOff } from "lucide-react";
import { useLocalStorageBoolean } from "@/lib/use-local-storage";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useReadingLesson } from "@/lib/lessons/load";
import { useLiveQuery } from "dexie-react-hooks";
import { listAttemptsForLesson, getDraft, deleteDraft } from "@/lib/db/queries";
import { LessonTimer } from "@/components/reading/lesson-timer";
import { useTimerStore } from "@/stores/timer-store";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/lib/lessons/types";
import { Passage } from "@/components/reading/passage";
import { GrammarNotes } from "@/components/reading/grammar-notes";
import { HintSettingsPopover } from "@/components/reading/hint-settings-popover";
import { usePreferences } from "@/lib/db/use-preferences";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import { QuizSection } from "@/components/reading/quiz-section";
import { MCQuestions } from "@/components/reading/mc-questions";
import { ClozeBlock } from "@/components/reading/cloze-block";
import { ClozeReview } from "@/components/reading/cloze-review";
import { QuizFooter } from "@/components/reading/quiz-footer";
import { ResumeBanner } from "@/components/reading/resume-banner";
import { LayoutToggle } from "@/components/reading/layout-toggle";
import { AttemptHistory } from "@/components/reading/attempt-history";
import { BookmarkButton } from "@/components/reading/bookmark-button";
import { LessonNotes } from "@/components/reading/lesson-notes";

const LEVEL_CLASS: Record<Lesson["level"], string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = use(params);
  const profileId = useActiveProfileId();
  const { data: lesson } = useReadingLesson(lessonId);
  const attempts = useLiveQuery(
    () => listAttemptsForLesson(profileId, lessonId),
    [profileId, lessonId],
  );
  const reset = useTimerStore((s) => s.reset);
  const prefs = usePreferences();
  const draft = useLiveQuery(
    () => getDraft(profileId, lessonId),
    [profileId, lessonId],
  );
  const [contentPinned, setContentPinned] = useLocalStorageBoolean(
    "reading.lessonContentPinned",
  );
  // Forces QuizSection to remount only on explicit abandon — never on
  // automatic draft transitions (e.g. submit deletes the draft).
  const [sessionEpoch, setSessionEpoch] = useState(0);

  async function abandonDraft() {
    await deleteDraft(profileId, lessonId);
    reset();
    setSessionEpoch((s) => s + 1);
  }

  if (!lesson) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const best = attempts?.reduce<(typeof attempts)[number] | undefined>(
    (acc, a) => (!acc || a.score > acc.score ? a : acc),
    undefined,
  );

  const hasDraft = draft != null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <header className="sticky top-0 z-30 -mx-4 mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2 bg-background/90 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6 sm:py-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/reading"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Back to Reading
          </Link>
          <h1 className="text-lg font-semibold leading-tight sm:text-xl">
            {lesson.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-semibold",
                LEVEL_CLASS[lesson.level],
              )}
            >
              {lesson.level}
            </span>
            {lesson.tags.map((t) => (
              <span key={t} className="text-muted-foreground">
                #{t}
              </span>
            ))}
            <span className="text-muted-foreground">
              {best
                ? `Best ${best.score}/${best.total} · ${attempts?.length} attempts`
                : "No attempts yet"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BookmarkButton lessonId={lessonId} variant="inline" />
          <LessonTimer />
          <HintSettingsPopover />
          <LayoutToggle />
        </div>
      </header>

      <div className="mb-4 rounded-md border bg-muted/40 p-3 text-sm italic shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
        <strong className="not-italic">Summary:</strong> {lesson.summary}
      </div>

      <QuizSection
        key={`${lessonId}-${sessionEpoch}`}
        lesson={lesson}
        initialPicks={draft?.answers ?? {}}
        initialClozePicks={draft?.clozePicks ?? {}}
        initialDurationMs={draft?.durationMs ?? 0}
        onAttemptSaved={() => {}}
      >
        {hasDraft && <ResumeBanner onAbandon={abandonDraft} />}

        <div
          className={cn(
            "gap-3 sm:gap-4",
            prefs.detailLayout === "two-column"
              ? "grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] lg:grid-rows-[auto_1fr]"
              : "flex flex-col",
          )}
        >
          <section
            className={cn(
              "relative rounded-md border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]",
              prefs.detailLayout === "two-column" &&
                "lg:col-start-1 lg:row-start-1 lg:row-end-3",
              contentPinned &&
                "sticky top-40 z-20 max-h-[60vh] overflow-y-auto md:top-[6.5625rem]",
              contentPinned &&
                prefs.detailLayout === "two-column" &&
                "lg:max-h-[calc(100vh-7rem)]",
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setContentPinned(!contentPinned)}
                  aria-pressed={contentPinned}
                  aria-label={
                    contentPinned
                      ? "Unpin lesson content"
                      : "Pin lesson content"
                  }
                  className={cn(
                    "cursor-pointer absolute right-1 top-1 z-10 text-muted-foreground transition-colors hover:text-foreground",
                    contentPinned && "text-primary",
                  )}
                >
                  {contentPinned ? (
                    <PinOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Pin className="size-4" aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {contentPinned
                  ? "Unpin lesson content"
                  : "Pin lesson content while scrolling"}
              </TooltipContent>
            </Tooltip>
            <Passage
              lesson={lesson}
              showAnnotations={prefs.hintToggles.vocabVi}
              showTranslation={prefs.hintToggles.passageTranslation}
            />
          </section>
          {prefs.hintToggles.grammar && (
            <div
              className={cn(
                prefs.detailLayout === "two-column" &&
                  "lg:col-start-2 lg:row-start-1",
              )}
            >
              <GrammarNotes notes={lesson.grammarNotes} />
            </div>
          )}
          <section
            className={cn(
              "rounded-md border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]",
              prefs.detailLayout === "two-column" &&
                "lg:col-start-2 lg:row-start-2",
            )}
          >
            <MCQuestions showHint={prefs.hintToggles.perQuestionHint} />
          </section>
        </div>

        {lesson.cloze && (
          <section className="mt-3 rounded-md sm:mt-4 border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
            <ClozeBlock />
            <ClozeReview />
          </section>
        )}

        <QuizFooter />
      </QuizSection>

      {lesson.criticalThinkingQuestion && (
        <section className="mt-3 rounded-md sm:mt-4 border-l-4 border-primary bg-muted/40 p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Critical thinking
          </h2>
          <p className="text-sm italic leading-relaxed">
            {lesson.criticalThinkingQuestion}
          </p>
        </section>
      )}

      <AttemptHistory lessonId={lessonId} />
      <LessonNotes lessonId={lessonId} />
    </div>
  );
}
