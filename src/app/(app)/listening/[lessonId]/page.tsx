"use client";

import { Suspense, use, useEffect, useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { useLocalStorageBoolean } from "@/lib/use-local-storage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useListeningLesson } from "@/lib/lessons/load";
import { useLiveQuery } from "dexie-react-hooks";
import { listAttemptsForLesson, getDraft, deleteDraft } from "@/lib/db/queries";
import { LessonTimer } from "@/components/reading/lesson-timer";
import { useTimerStore } from "@/stores/timer-store";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/lib/lessons/types";
import { Transcript } from "@/components/listening/transcript";
import { TranscriptPlayer } from "@/components/listening/transcript-player";
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
import { AccentFlag } from "@/components/ui/accent-flag";
import { useListeningAudioStore } from "@/stores/listening-audio-store";
import { PlaybackTimeline } from "@/components/listening/playback-timeline";
import { LessonDetailHeader } from "@/components/lesson/lesson-detail-header";
import { DetailCard } from "@/components/lesson/detail-card";
import { AccentBlock } from "@/components/lesson/accent-block";
import { formatDuration } from "@/lib/format";

function ListeningLessonDetailContent({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const profileId = useActiveProfileId();
  const { data: lesson } = useListeningLesson(lessonId);
  const attempts = useLiveQuery(() => listAttemptsForLesson(profileId, lessonId), [profileId, lessonId]);
  const reset = useTimerStore((s) => s.reset);
  const prefs = usePreferences();
  const draft = useLiveQuery(() => getDraft(profileId, lessonId), [profileId, lessonId]);
  const [contentPinned, setContentPinned] = useLocalStorageBoolean("listening.lessonContentPinned");
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const loadAudio = useListeningAudioStore((s) => s.load);
  const stopAudio = useListeningAudioStore((s) => s.stop);

  useEffect(() => {
    if (!lesson) return;
    loadAudio(lesson.id, lesson.audio.cdnBase, lesson.sentences, lesson.audio.manifestVersion);
  }, [lesson, loadAudio]);

  useEffect(() => () => stopAudio(), [lessonId, stopAudio]);

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

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <TranscriptPlayer />
      <PlaybackTimeline sentences={lesson.sentences} />

      <LessonDetailHeader
        backHref="/listening"
        backLabel="Back to Listening"
        level={lesson.level}
        title={lesson.title}
        meta={
          <>
            <AccentFlag accents={lesson.accents} />
            <span className="text-neutral-500">{lesson.totalDurationMs ? formatDuration(lesson.totalDurationMs) : "audio pending"}</span>
            <span className="text-neutral-400">·</span>
            <span className="text-neutral-500">{lesson.sentences.length} sentences</span>
            {lesson.tags.map((t) => (
              <span key={t} className="text-neutral-500">#{t}</span>
            ))}
            <span className="text-neutral-500">
              {best ? `Best ${best.score}/${best.total} · ${attempts?.length} attempts` : "No attempts yet"}
            </span>
          </>
        }
        toolbar={
          <>
            <LessonTimer />
            <HintSettingsPopover />
            <BookmarkButton lessonId={lessonId} variant="inline" />
            <LayoutToggle />
          </>
        }
      />

      <p className="mt-4 rounded-xl bg-neutral-100/60 px-4 py-3 text-sm dark:bg-white/5">
        <strong className="font-semibold">Summary:</strong>{" "}
        <span className="italic text-neutral-600 dark:text-neutral-300">{lesson.summary}</span>
      </p>

      <QuizSection
        key={`${lessonId}-${sessionEpoch}`}
        lesson={lesson as unknown as Lesson}
        initialPicks={draft?.answers ?? {}}
        initialClozePicks={draft?.clozePicks ?? {}}
        initialDurationMs={draft?.durationMs ?? 0}
        onAttemptSaved={() => {}}
      >
        {hasDraft && (
          <div className="mt-4">
            <ResumeBanner onAbandon={abandonDraft} />
          </div>
        )}

        <div
          className={cn(
            "mt-4 gap-4",
            prefs.detailLayout === "two-column"
              ? "grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] lg:grid-rows-[auto_1fr]"
              : "flex flex-col",
          )}
        >
          <DetailCard
            className={cn(
              "relative",
              prefs.detailLayout === "two-column" && "lg:col-start-1 lg:row-start-1 lg:row-end-3",
              contentPinned && "sticky top-32 z-20 max-h-[60vh] overflow-y-auto",
              contentPinned && prefs.detailLayout === "two-column" && "lg:max-h-[calc(100vh-9rem)]",
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
                  {contentPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {contentPinned ? "Unpin lesson content" : "Pin lesson content while scrolling"}
              </TooltipContent>
            </Tooltip>
            <Transcript
              lesson={lesson}
              showAnnotations={prefs.hintToggles.vocabVi}
              showTranslation={prefs.hintToggles.passageTranslation}
            />
          </DetailCard>

          {prefs.hintToggles.grammar && (
            <div className={cn(prefs.detailLayout === "two-column" && "lg:col-start-2 lg:row-start-1")}>
              <GrammarNotes notes={lesson.grammarNotes} />
            </div>
          )}

          <DetailCard className={cn(prefs.detailLayout === "two-column" && "lg:col-start-2 lg:row-start-2")}>
            <MCQuestions showHint={prefs.hintToggles.perQuestionHint} />
          </DetailCard>
        </div>

        {lesson.cloze && (
          <DetailCard className="mt-4">
            <ClozeBlock />
            <ClozeReview />
          </DetailCard>
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
    </main>
  );
}

export default function ListeningLessonDetailPage({ params }: { params: Promise<{ lessonId: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-neutral-500">Loading…</div>}>
      <ListeningLessonDetailContent params={params} />
    </Suspense>
  );
}
