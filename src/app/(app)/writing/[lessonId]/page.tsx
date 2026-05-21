"use client";

import { Suspense, use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { WritingLesson } from "@/lib/lessons/types";
import {
  WritingSessionProvider,
  useWritingSession,
} from "@/components/writing/writing-session";
import { WritingPromptCard } from "@/components/writing/writing-prompt-card";
import { HintPanel } from "@/components/writing/hint-panel";
import { WritingEditor } from "@/components/writing/writing-editor";
import { SampleAnswerReveal } from "@/components/writing/sample-answer-reveal";
import { PromptCopyPanel } from "@/components/writing/prompt-copy-panel";
import { WritingResultWaiting } from "@/components/writing/writing-result-waiting";
import { WritingResultPanel } from "@/components/writing/writing-result-panel";
import { WritingAttemptHistory } from "@/components/writing/writing-attempt-history";
import { AiFeedbackGuide } from "@/components/writing/ai-feedback-guide";

const LEVEL_CLASS: Record<WritingLesson["level"], string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

function MainArea() {
  const { lesson, mcPicks, setMcPick, phase, llmResult } = useWritingSession();
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
          {phase === "waiting" && <WritingResultWaiting />}
          {phase === "ready" && llmResult && <WritingResultPanel result={llmResult} />}
        </div>
        <div className="space-y-3">
          <HintPanel lesson={lesson} />
        </div>
      </div>

      <section className="mt-3 rounded-md sm:mt-4 border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
        <MCQuestions
          showHint={prefs.hintToggles.perQuestionHint}
          questions={lesson.mcQuestions}
          picks={mcPicks}
          onPick={setMcPick}
          label="Sentence-choice quiz"
        />
      </section>

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

      <WritingAttemptHistory lessonId={lesson.id} />
      <LessonNotes lessonId={lesson.id} />
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
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <header className="sticky top-0 z-30 -mx-4 mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2 bg-background/90 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6 sm:py-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/writing"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Back to Writing
          </Link>
          <h1 className="text-lg font-semibold leading-tight sm:text-xl">
            {lesson.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded px-1.5 py-0.5 font-semibold", LEVEL_CLASS[lesson.level])}>
              {lesson.level}
            </span>
            {lesson.tags.map((t) => (
              <span key={t} className="text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BookmarkButton lessonId={lessonId} variant="inline" />
          <LessonTimer />
          <HintSettingsPopover />
          <LayoutToggle />
        </div>
      </header>

      <WritingSessionProvider lesson={lesson} initialDraft={draft}>
        <AiFeedbackGuide />
        <MainArea />
      </WritingSessionProvider>
    </div>
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
