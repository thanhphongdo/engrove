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
import { Button } from "@/components/ui/button";
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
import { LessonDetailHeader } from "@/components/lesson/lesson-detail-header";
import { DetailCard } from "@/components/lesson/detail-card";
import { AccentBlock } from "@/components/lesson/accent-block";

function McQuizSection() {
  const { lesson, mcPicks, setMcPick, mcResult, reviewMode, submitMc, retryMc } =
    useWritingSession();
  const prefs = usePreferences();
  const answered = Object.keys(mcPicks).length;
  const total = lesson.mcQuestions.length;
  const unanswered = total - answered;

  return (
    <DetailCard className="mt-4">
      <MCQuestions
        showHint={prefs.hintToggles.perQuestionHint}
        questions={lesson.mcQuestions}
        picks={mcPicks}
        onPick={setMcPick}
        reviewMode={reviewMode}
        label="Sentence-choice quiz"
      />
      {reviewMode && mcResult ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-sm font-semibold">
            Score: {mcResult.score}/{mcResult.total}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={retryMc}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            {answered} / {total} answered
          </p>
          {unanswered > 0 ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" className="sm:min-w-40">
                  Submit
                </Button>
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
            <Button
              type="button"
              size="sm"
              className="sm:min-w-40"
              onClick={submitMc}
            >
              Submit
            </Button>
          )}
        </div>
      )}
    </DetailCard>
  );
}

function MainArea() {
  const { lesson, phase, llmResult } = useWritingSession();
  const prefs = usePreferences();
  return (
    <>
      <WritingPromptCard lesson={lesson} />

      <div
        className={cn(
          "gap-3 sm:gap-4",
          prefs.detailLayout === "two-column"
            ? "grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]"
            : "flex flex-col",
        )}
      >
        <div className="space-y-3">
          <WritingEditor />
          <SampleAnswerReveal />
          <PromptCopyPanel />
          {phase === "ready" && llmResult && <WritingResultPanel result={llmResult} />}
        </div>
        <div className="space-y-3">
          <HintPanel lesson={lesson} />
        </div>
      </div>

      <McQuizSection />


      {lesson.criticalThinkingQuestion && (
        <AccentBlock className="mt-4" label="Think about it">
          <p className="text-sm italic leading-relaxed text-neutral-700 dark:text-neutral-200">
            {lesson.criticalThinkingQuestion}
          </p>
        </AccentBlock>
      )}

      <div className="mt-4 space-y-4">
        <WritingAttemptHistory lessonId={lesson.id} />
        <LessonNotes lessonId={lesson.id} />
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

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <LessonDetailHeader
        backHref="/writing"
        backLabel="Back to Writing"
        level={lesson.level}
        title={lesson.title}
        meta={lesson.tags.map((t) => (
          <span key={t} className="text-neutral-500">#{t}</span>
        ))}
        toolbar={
          <>
            <LessonTimer />
            <HintSettingsPopover />
            <BookmarkButton lessonId={lessonId} variant="inline" />
            <LayoutToggle />
          </>
        }
      />

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
