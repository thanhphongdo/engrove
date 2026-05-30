"use client";

import { Suspense, use } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useWritingLesson } from "@/lib/lessons/load";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import { getWritingDraft } from "@/lib/db/queries";
import { usePreferences } from "@/lib/db/use-preferences";
import { LessonTimer } from "@/components/reading/lesson-timer";
import { HintSettingsPopover } from "@/components/reading/hint-settings-popover";
import { LayoutToggle } from "@/components/reading/layout-toggle";
import { BookmarkButton } from "@/components/reading/bookmark-button";
import { LessonNotes } from "@/components/reading/lesson-notes";
import { MCQuestions } from "@/components/reading/mc-questions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  WritingSessionProvider,
  useWritingSession,
} from "@/components/writing/writing-session";
import { WritingPromptCard } from "@/components/writing/writing-prompt-card";
import { HintPanel } from "@/components/writing/hint-panel";
import { WritingEditor } from "@/components/writing/writing-editor";
import { SampleAnswerReveal } from "@/components/writing/sample-answer-reveal";
import { PromptCopyPanel } from "@/components/writing/prompt-copy-panel";
import { WritingResultPanel } from "@/components/writing/writing-result-panel";
import { WritingAttemptHistory } from "@/components/writing/writing-attempt-history";
import { AiFeedbackGuide } from "@/components/writing/ai-feedback-guide";
import { LessonDetailHeader, LessonMetaRow } from "@/components/lesson/lesson-detail-header";
import { LessonTags } from "@/components/lesson/lesson-tags";
import { DetailCard } from "@/components/lesson/detail-card";
import { AccentBlock } from "@/components/lesson/accent-block";

const SUBMIT_BTN =
  "rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100";

function McQuizSection() {
  const { lesson, mcPicks, setMcPick, mcResult, reviewMode, submitMc, retryMc } =
    useWritingSession();
  const prefs = usePreferences();
  const answered = Object.keys(mcPicks).length;
  const total = lesson.mcQuestions.length;
  const unanswered = total - answered;

  return (
    <DetailCard>
      <MCQuestions
        showHint={prefs.hintToggles.perQuestionHint}
        questions={lesson.mcQuestions}
        picks={mcPicks}
        onPick={setMcPick}
        reviewMode={reviewMode}
        label="Sentence-choice quiz"
      />
      {reviewMode && mcResult ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Score: {mcResult.score}/{mcResult.total}
          </p>
          <button
            type="button"
            onClick={retryMc}
            className="rounded-xl border border-neutral-200 bg-white px-5 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-white/5"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.8rem] text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{answered}</span> / {total} answered
          </p>
          {unanswered > 0 ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className={SUBMIT_BTN}>
                  Submit
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {unanswered} question{unanswered === 1 ? "" : "s"} unanswered
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Unanswered questions count as wrong. Submit anyway?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={submitMc}>Submit</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <button type="button" className={SUBMIT_BTN} onClick={submitMc}>
              Submit
            </button>
          )}
        </div>
      )}
    </DetailCard>
  );
}

function MainArea() {
  const { lesson, phase, llmResult } = useWritingSession();
  const prefs = usePreferences();
  const twoColumn = prefs.detailLayout === "two-column";

  return (
    <>
      <WritingPromptCard lesson={lesson} />

      <div
        className={cn(
          "mt-6 gap-4",
          twoColumn ? "grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]" : "flex flex-col",
        )}
      >
        {/* LEFT: editor + sample + AI feedback + result */}
        <div className="space-y-4">
          <WritingEditor />
          <SampleAnswerReveal />
          <PromptCopyPanel />
          {phase === "ready" && llmResult && <WritingResultPanel result={llmResult} />}
        </div>

        {/* RIGHT (aside): hints, quiz, critical thinking, history, notes */}
        <aside className="space-y-4">
          <HintPanel lesson={lesson} />
          <McQuizSection />
          {lesson.criticalThinkingQuestion && (
            <AccentBlock label="Think about it">
              <p className="text-sm italic leading-relaxed text-neutral-700 dark:text-neutral-300">
                {lesson.criticalThinkingQuestion}
              </p>
            </AccentBlock>
          )}
          <WritingAttemptHistory lessonId={lesson.id} />
          <LessonNotes lessonId={lesson.id} />
        </aside>
      </div>
    </>
  );
}

function LessonDetailContent({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = use(params);
  const profileId = useActiveProfileId();
  const { data: lesson } = useWritingLesson(lessonId);
  const draft = useLiveQuery(
    () => getWritingDraft(profileId, lessonId),
    [profileId, lessonId],
  );

  if (!lesson) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const wordTarget =
    lesson.minWords && lesson.maxWords
      ? `Target ${lesson.minWords}–${lesson.maxWords} words`
      : lesson.minWords
        ? `Target ${lesson.minWords}+ words`
        : lesson.maxWords
          ? `Target up to ${lesson.maxWords} words`
          : null;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <LessonDetailHeader
        backHref="/writing"
        backLabel="Back to Writing"
        title={lesson.title}
        toolbar={
          <>
            <LessonTimer />
            <HintSettingsPopover />
            <BookmarkButton lessonId={lessonId} variant="inline" />
            <LayoutToggle />
          </>
        }
      />

      <LessonMetaRow level={lesson.level}>
        <LessonTags skill="writing" tags={lesson.tags} currentLessonId={lesson.id} />
        {wordTarget && (
          <>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span className="text-neutral-500">{wordTarget}</span>
          </>
        )}
      </LessonMetaRow>

      <div className="mt-4">
        <WritingSessionProvider lesson={lesson} initialDraft={draft}>
          <AiFeedbackGuide />
          <MainArea />
        </WritingSessionProvider>
      </div>
    </main>
  );
}

export default function WritingLessonDetailPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <LessonDetailContent params={params} />
    </Suspense>
  );
}
