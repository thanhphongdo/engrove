"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useLocalStorageBoolean } from "@/lib/use-local-storage";
import { useListeningLesson } from "@/lib/lessons/load";
import { useLiveQuery } from "dexie-react-hooks";
import { listAttemptsForLesson, getDraft, deleteDraft } from "@/lib/db/queries";
import { LessonTimer } from "@/components/reading/lesson-timer";
import { useTimerStore } from "@/stores/timer-store";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/lib/lessons/types";
import { SentenceTimeline, TranscriptCard } from "@/components/listening/transcript";
import { InlinePlaybackBar } from "@/components/listening/inline-playback-bar";
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
import { LessonDetailHeader, LessonMetaRow } from "@/components/lesson/lesson-detail-header";
import { LessonMobileBar } from "@/components/lesson/lesson-mobile-bar";
import { LessonTags } from "@/components/lesson/lesson-tags";
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
  const [transcriptShown, setTranscriptShown] = useState(false);
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
  const isTwoColumn = prefs.detailLayout === "two-column";

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 sm:px-6 md:pb-12">
      <TranscriptPlayer />
      <PlaybackTimeline sentences={lesson.sentences} />

      <LessonDetailHeader
        backHref="/listening"
        backLabel="Back to Listening"
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
        <AccentFlag accents={lesson.accents} />
        <span className="text-neutral-500">
          {lesson.totalDurationMs ? formatDuration(lesson.totalDurationMs) : "audio pending"}
        </span>
        <span className="text-neutral-300 dark:text-neutral-600">·</span>
        <span className="text-neutral-500">{lesson.sentences.length} sentences</span>
        <LessonTags skill="listening" tags={lesson.tags} currentLessonId={lesson.id} />
        <span className="text-neutral-300 dark:text-neutral-600">·</span>
        <span className="text-neutral-500">
          {best ? `Best ${best.score}/${best.total} · ${attempts?.length} attempts` : "No attempts yet"}
        </span>
      </LessonMetaRow>

      {/* 1. Audio player card */}
      <DetailCard className="mt-4">
        <InlinePlaybackBar
          lessonId={lesson.id}
          cdnBase={lesson.audio.cdnBase}
          manifestVersion={lesson.audio.manifestVersion}
          sentences={lesson.sentences}
          totalDurationMs={lesson.totalDurationMs}
          transcriptShown={transcriptShown}
          onToggleTranscript={() => setTranscriptShown((v) => !v)}
        />
      </DetailCard>

      {/* 2. Sentence timeline */}
      <SentenceTimeline lesson={lesson} />

      {/* 3. Summary */}
      <AccentBlock className="mt-6">
        <strong className="not-italic text-emerald-800 dark:text-emerald-300">Summary:</strong>{" "}
        <span className="italic text-neutral-700 dark:text-neutral-300">{lesson.summary}</span>
      </AccentBlock>

      <QuizSection
        key={`${lessonId}-${sessionEpoch}`}
        lesson={lesson as unknown as Lesson}
        initialPicks={draft?.answers ?? {}}
        initialClozePicks={draft?.clozePicks ?? {}}
        initialDurationMs={draft?.durationMs ?? 0}
        onAttemptSaved={() => {}}
      >
        {/* 4. Resume banner */}
        {hasDraft && (
          <div className="mt-4">
            <ResumeBanner onAbandon={abandonDraft} />
          </div>
        )}

        {/* 5. Two-column: transcript LEFT · grammar + MC RIGHT */}
        <div
          className={cn(
            "mt-6 gap-6",
            isTwoColumn ? "grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]" : "flex flex-col",
          )}
        >
          <DetailCard
            className={cn(
              isTwoColumn && "self-start",
              contentPinned && "sticky top-32 z-20 max-h-[60vh] overflow-y-auto",
              contentPinned && isTwoColumn && "lg:max-h-[calc(100vh-9rem)]",
            )}
          >
            <TranscriptCard
              lesson={lesson}
              shown={transcriptShown}
              showAnnotations={prefs.hintToggles.vocabVi}
              showTranslation={prefs.hintToggles.passageTranslation}
              pinned={contentPinned}
              onToggle={() => setTranscriptShown((v) => !v)}
              onTogglePin={() => setContentPinned(!contentPinned)}
            />
          </DetailCard>

          <div className="flex flex-col gap-6">
            {prefs.hintToggles.grammar && <GrammarNotes notes={lesson.grammarNotes} />}
            <DetailCard>
              <MCQuestions showHint={prefs.hintToggles.perQuestionHint} label="Listening questions" />
            </DetailCard>
          </div>
        </div>

        {/* 6. Cloze */}
        {lesson.cloze && (
          <div className="mt-6">
            <ClozeBlock />
            <ClozeReview />
          </div>
        )}

        {/* 7. Quiz footer */}
        <QuizFooter showProgress />
      </QuizSection>

      {/* 8. Critical thinking */}
      {lesson.criticalThinkingQuestion && (
        <AccentBlock className="mt-6" label="Critical thinking">
          <p className="text-sm italic leading-relaxed text-neutral-700 dark:text-neutral-300">
            {lesson.criticalThinkingQuestion}
          </p>
        </AccentBlock>
      )}

      {/* 9. Attempt history */}
      <div className="mt-6">
        <AttemptHistory lessonId={lessonId} />
      </div>

      {/* 10. My notes */}
      <div className="mt-6">
        <LessonNotes lessonId={lessonId} />
      </div>

      <LessonMobileBar />
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
