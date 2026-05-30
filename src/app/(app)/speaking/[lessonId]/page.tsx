"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSpeakingLesson } from "@/lib/lessons/load";
import { SampleListenTab } from "@/components/speaking/sample-listen-tab";
import { PracticeSession, PREFERRED_VOICE_SEX_KEY } from "@/components/speaking/practice-session";
import { HintPanel } from "@/components/speaking/hint-panel";
import { RecordingsHistory } from "@/components/speaking/recordings-history";
import { HintSettingsPopover } from "@/components/reading/hint-settings-popover";
import { InlinePlaybackBar } from "@/components/listening/inline-playback-bar";
import { DetailCard } from "@/components/lesson/detail-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalStorageString } from "@/lib/use-local-storage";
import { LessonDetailHeader, LessonMetaRow } from "@/components/lesson/lesson-detail-header";
import { LessonTags } from "@/components/lesson/lesson-tags";

function DetailContent() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading, error } = useSpeakingLesson(lessonId);

  const [role, setRole] = useState<string>("");
  const [controlsContainer, setControlsContainer] = useState<HTMLElement | null>(null);
  const [mobileControlsContainer, setMobileControlsContainer] = useState<HTMLElement | null>(null);
  const [resultContainer, setResultContainer] = useState<HTMLElement | null>(null);
  const [practiceActive, setPracticeActive] = useState(false);
  const [preferredVoiceSex] = useLocalStorageString<"female" | "male">(PREFERRED_VOICE_SEX_KEY, "female");

  // Default role once the lesson loads: the character whose voice matches the
  // remembered voice preference, else the first character.
  useEffect(() => {
    if (!lesson || role) return;
    const match = lesson.characters.find((c) => lesson.voices[c]?.sex === preferredVoiceSex);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRole(match ?? lesson.characters[0]);
  }, [lesson, role, preferredVoiceSex]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-center text-neutral-500 sm:px-6">
        Lesson not found.{" "}
        <Link href="/speaking" className="underline">Back to Speaking</Link>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 sm:px-6 md:pb-12">
      <LessonDetailHeader
        backHref="/speaking"
        backLabel="Back to Speaking"
        title={lesson.title}
        align="center"
        toolbar={
          // Shown on every breakpoint (like the listening lesson). On mobile the
          // primary "Start practice" itself hides here and moves to the sticky
          // bottom bar; Hints + Options stay.
          <>
            <HintSettingsPopover />
            {/* Practice controls (Start practice / Options / Practice again) portal in here. */}
            <div ref={(el) => setControlsContainer(el)} className="flex items-center gap-2" />
          </>
        }
      />

      <LessonMetaRow level={lesson.level}>
        <LessonTags skill="speaking" tags={lesson.tags} currentLessonId={lesson.id} />
      </LessonMetaRow>

      {/* Two-column layout: practice/transcript card | hint aside */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <DetailCard>
          {/* Play-all waveform row (borderless, on subtle tint) */}
          <div className="flex items-center gap-3 rounded-xl bg-neutral-50 p-2.5 dark:bg-white/5">
            <InlinePlaybackBar
              lessonId={lesson.id}
              cdnBase={`${lesson.audio.cdnBase}/sentences`}
              manifestVersion={lesson.audio.manifestVersion}
              sentences={lesson.sentences}
              totalDurationMs={lesson.totalDurationMs}
              compact
            />
          </div>

          {/* Sample transcript (hidden once practice is active) + practice session */}
          {!practiceActive && role && <SampleListenTab lesson={lesson} role={role} />}
          {role && (
            <PracticeSession
              lesson={lesson}
              role={role}
              onRoleChange={setRole}
              controlsContainer={controlsContainer}
              mobileControlsContainer={mobileControlsContainer}
              resultContainer={resultContainer}
              onActiveChange={setPracticeActive}
            />
          )}
        </DetailCard>

        <aside className="space-y-3">
          <HintPanel lesson={lesson} />
        </aside>
      </div>

      {/* Mix result (after Mix & Save) — full-width below the grid. */}
      <div ref={(el) => setResultContainer(el)} />

      <div className="mt-4">
        <RecordingsHistory lessonId={lesson.id} lessonTitle={lesson.title} />
      </div>

      {/* Mobile sticky action bar — full-width primary action, mirrored from the
          header so it's reachable by thumb. Hints + Options stay in the header. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-neutral-900/95 md:hidden">
        <div ref={(el) => setMobileControlsContainer(el)} className="flex flex-1" />
      </div>
    </main>
  );
}

export default function SpeakingDetailPage() {
  return (
    <Suspense>
      <DetailContent />
    </Suspense>
  );
}
