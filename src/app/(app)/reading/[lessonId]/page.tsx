"use client";

import { Suspense, use, useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { useLocalStorageBoolean } from "@/lib/use-local-storage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useReadingLesson } from "@/lib/lessons/load";
import { useLiveQuery } from "dexie-react-hooks";
import { listAttemptsForLesson, getDraft, deleteDraft } from "@/lib/db/queries";
import { LessonTimer } from "@/components/reading/lesson-timer";
import { useTimerStore } from "@/stores/timer-store";
import { cn } from "@/lib/utils";
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
import { LessonDetailHeader, LessonMetaRow } from "@/components/lesson/lesson-detail-header";
import { DetailCard } from "@/components/lesson/detail-card";
import { AccentBlock } from "@/components/lesson/accent-block";
import { LessonMobileBar } from "@/components/lesson/lesson-mobile-bar";

function LessonDetailContent({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const profileId = useActiveProfileId();
  const { data: lesson } = useReadingLesson(lessonId);
  const attempts = useLiveQuery(() => listAttemptsForLesson(profileId, lessonId), [profileId, lessonId]);
  const reset = useTimerStore((s) => s.reset);
  const prefs = usePreferences();
  const draft = useLiveQuery(() => getDraft(profileId, lessonId), [profileId, lessonId]);
  const [contentPinned, setContentPinned] = useLocalStorageBoolean("reading.lessonContentPinned");
  // Forces QuizSection to remount only on explicit abandon — never on automatic
  // draft transitions (e.g. submit deletes the draft).
  const [sessionEpoch, setSessionEpoch] = useState(0);

  async function abandonDraft() {
    await deleteDraft(profileId, lessonId);
    reset();
    setSessionEpoch((s) => s + 1);
  }

  if (!lesson) {
    return <div className="p-8 text-sm text-neutral-500">Loading…</div>;
  }

  const best = attempts?.reduce<(typeof attempts)[number] | undefined>(
    (acc, a) => (!acc || a.score > acc.score ? a : acc),
    undefined,
  );
  const hasDraft = draft != null;
  const totalQuestions = lesson.questions.length + (lesson.cloze?.blanks.length ?? 0);
  const draftAnswered = draft
    ? Object.keys(draft.answers ?? {}).length + Object.keys(draft.clozePicks ?? {}).length
    : 0;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 sm:px-6 md:pb-12">
      <LessonDetailHeader
        backHref="/reading"
        backLabel="Back to Reading"
        title={lesson.title}
        toolbar={
          <>
            <LessonTimer compactOnMobile />
            <HintSettingsPopover />
            <BookmarkButton lessonId={lessonId} variant="inline" />
            <LayoutToggle />
          </>
        }
      />

      <LessonMetaRow level={lesson.level}>
        {lesson.tags.map((t) => (
          <span key={t} className="text-neutral-500">#{t}</span>
        ))}
        <span className="text-neutral-300 dark:text-neutral-600">·</span>
        <span className="text-neutral-500">
          {best ? `Best ${best.score}/${best.total} · ${attempts?.length} attempts` : "No attempts yet"}
        </span>
      </LessonMetaRow>

      {hasDraft && (
        <div className="mt-4">
          <ResumeBanner onAbandon={abandonDraft} answered={draftAnswered} total={totalQuestions} />
        </div>
      )}

      <p className="mt-3 rounded-xl bg-neutral-100/60 px-4 py-3 text-sm dark:bg-white/5">
        <strong className="font-semibold">Summary:</strong>{" "}
        <span className="italic text-neutral-600 dark:text-neutral-300">{lesson.summary}</span>
      </p>

      <QuizSection
        key={`${lessonId}-${sessionEpoch}`}
        lesson={lesson}
        initialPicks={draft?.answers ?? {}}
        initialClozePicks={draft?.clozePicks ?? {}}
        initialDurationMs={draft?.durationMs ?? 0}
        onAttemptSaved={() => {}}
      >
        <div
          className={cn(
            "mt-4 gap-4",
            prefs.detailLayout === "two-column"
              ? "grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] lg:items-start"
              : "flex flex-col",
          )}
        >
          <DetailCard
            className={cn(
              "relative",
              contentPinned && "lg:sticky lg:top-32 lg:z-20 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto",
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setContentPinned(!contentPinned)}
                  aria-pressed={contentPinned}
                  aria-label={contentPinned ? "Unpin lesson content" : "Pin lesson content"}
                  className={cn(
                    "absolute right-2 top-2 z-10 grid size-8 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10",
                    contentPinned && "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {contentPinned ? <PinOff className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {contentPinned ? "Unpin lesson content" : "Pin lesson content while scrolling"}
              </TooltipContent>
            </Tooltip>
            <Passage
              lesson={lesson}
              showAnnotations={prefs.hintToggles.vocabVi}
              showTranslation={prefs.hintToggles.passageTranslation}
            />
          </DetailCard>

          <div className="flex flex-col gap-4">
            {prefs.hintToggles.grammar && <GrammarNotes notes={lesson.grammarNotes} />}
            <DetailCard>
              <MCQuestions showHint={prefs.hintToggles.perQuestionHint} />
            </DetailCard>
          </div>
        </div>

        {lesson.cloze && (
          <div className="mt-6">
            <ClozeBlock />
            <ClozeReview />
          </div>
        )}

        <QuizFooter />
      </QuizSection>

      {lesson.criticalThinkingQuestion && (
        <AccentBlock className="mt-4" label="Critical thinking">
          <p className="text-sm italic leading-relaxed text-neutral-700 dark:text-neutral-200">
            {lesson.criticalThinkingQuestion}
          </p>
        </AccentBlock>
      )}

      <div className="mt-4">
        <AttemptHistory lessonId={lessonId} />
      </div>
      <div className="mt-4">
        <LessonNotes lessonId={lessonId} />
      </div>

      <LessonMobileBar />
    </main>
  );
}

export default function LessonDetailPage({ params }: { params: Promise<{ lessonId: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-neutral-500">Loading…</div>}>
      <LessonDetailContent params={params} />
    </Suspense>
  );
}
