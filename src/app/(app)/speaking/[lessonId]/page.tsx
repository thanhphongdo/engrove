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
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalStorageString } from "@/lib/use-local-storage";
import { LessonDetailHeader } from "@/components/lesson/lesson-detail-header";

function DetailContent() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading, error } = useSpeakingLesson(lessonId);

  const [role, setRole] = useState<string>("");
  const [controlsContainer, setControlsContainer] = useState<HTMLElement | null>(null);
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
            {/* Practice controls (Start practice / record / restart) portal in here. */}
            <div ref={(el) => setControlsContainer(el)} className="flex items-center gap-2" />
          </>
        }
      />

      {/* Play-all bar */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-2.5 dark:border-white/10 dark:bg-neutral-900">
        <InlinePlaybackBar
          lessonId={lesson.id}
          cdnBase={`${lesson.audio.cdnBase}/sentences`}
          manifestVersion={lesson.audio.manifestVersion}
          sentences={lesson.sentences}
          totalDurationMs={lesson.totalDurationMs}
        />
      </div>

      {/* Two-column layout: main | 320px sidebar */}
      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-8">
          {!practiceActive && role && <SampleListenTab lesson={lesson} role={role} />}
          {role && (
            <PracticeSession
              lesson={lesson}
              role={role}
              onRoleChange={setRole}
              controlsContainer={controlsContainer}
              onActiveChange={setPracticeActive}
            />
          )}
          <RecordingsHistory lessonId={lesson.id} lessonTitle={lesson.title} />
        </div>
        <aside className="w-full shrink-0 lg:w-80">
          <HintPanel lesson={lesson} />
        </aside>
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
