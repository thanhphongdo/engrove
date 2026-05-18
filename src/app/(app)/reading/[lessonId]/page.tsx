"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAllReadingLessons } from "@/lib/lessons/load";
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

const LEVEL_CLASS: Record<Lesson["level"], string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

export default function LessonDetailPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const profileId = useActiveProfileId();
  const { data: lessons } = useAllReadingLessons();
  const lesson = useMemo(() => lessons?.find((l) => l.id === lessonId), [lessons, lessonId]);
  const attempts = useLiveQuery(
    () => listAttemptsForLesson(profileId, lessonId),
    [profileId, lessonId],
  );
  const reset = useTimerStore((s) => s.reset);
  const prefs = usePreferences();
  const draft = useLiveQuery(() => getDraft(profileId, lessonId), [profileId, lessonId]);

  async function abandonDraft() {
    await deleteDraft(profileId, lessonId);
    reset();
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
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/reading"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Back to Reading
          </Link>
          <h1 className="text-xl font-semibold">{lesson.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded px-1.5 py-0.5 font-semibold", LEVEL_CLASS[lesson.level])}>
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
        <div className="flex items-center gap-2">
          <LessonTimer />
          <HintSettingsPopover />
          <LayoutToggle />
        </div>
      </header>

      <div className="mb-4 rounded-md border bg-muted/40 p-3 text-sm italic">
        <strong className="not-italic">Summary:</strong> {lesson.summary}
      </div>

      <QuizSection
        key={`${lessonId}-${hasDraft ? "draft" : "fresh"}`}
        lesson={lesson}
        initialPicks={draft?.answers ?? {}}
        initialClozePicks={draft?.clozePicks ?? {}}
        initialDurationMs={draft?.durationMs ?? 0}
        onAttemptSaved={() => {}}
      >
        {hasDraft && <ResumeBanner onAbandon={abandonDraft} />}

        <div
          className={
            prefs.detailLayout === "two-column"
              ? "grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]"
              : "flex flex-col gap-4"
          }
        >
          <section className="rounded-md border bg-card p-4">
            <Passage
              lesson={lesson}
              showAnnotations={prefs.hintToggles.vocabVi}
              showTranslation={prefs.hintToggles.passageTranslation}
            />
            {prefs.hintToggles.grammar && <GrammarNotes notes={lesson.grammarNotes} />}
          </section>
          <section className="rounded-md border bg-card p-4">
            <MCQuestions showHint={prefs.hintToggles.perQuestionHint} />
          </section>
        </div>

        {lesson.cloze && (
          <section className="mt-4 rounded-md border bg-card p-4">
            <ClozeBlock />
            <ClozeReview />
          </section>
        )}

        <QuizFooter />
      </QuizSection>

      <AttemptHistory lessonId={lessonId} />
    </div>
  );
}
