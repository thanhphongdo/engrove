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
import { LessonDetailHeader } from "@/components/lesson/lesson-detail-header";

function DetailContent() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading, error } = useSpeakingLesson(lessonId);

  const [role, setRole] = useState<string>("");
  const [controlsContainer, setControlsContainer] = useState<HTMLElement | null>(null);
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
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <LessonDetailHeader
        backHref="/speaking"
        backLabel="Back to Speaking"
        level={lesson.level}
        title={lesson.title}
        align="center"
        meta={lesson.tags.map((t) => (
          <span key={t} className="text-neutral-500">#{t}</span>
        ))}
        toolbar={
          <>
            <HintSettingsPopover />
            {/* Practice controls (Start practice / Options / Practice again) portal in here. */}
            <div ref={(el) => setControlsContainer(el)} className="flex items-center gap-2" />
          </>
        }
      />

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
