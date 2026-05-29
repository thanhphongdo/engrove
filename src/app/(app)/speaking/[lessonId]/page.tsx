"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSpeakingLesson } from "@/lib/lessons/load";
import { SampleListenTab } from "@/components/speaking/sample-listen-tab";
import { PracticeSession, PREFERRED_VOICE_SEX_KEY } from "@/components/speaking/practice-session";
import { HintPanel } from "@/components/speaking/hint-panel";
import { RecordingsHistory } from "@/components/speaking/recordings-history";
import { HintSettingsPopover } from "@/components/reading/hint-settings-popover";
import { InlinePlaybackBar } from "@/components/listening/inline-playback-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalStorageString } from "@/lib/use-local-storage";
import { cn } from "@/lib/utils";

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

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
    setRole(match ?? lesson.characters[0]);
  }, [lesson, role, preferredVoiceSex]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 text-center text-muted-foreground">
        Lesson not found.{" "}
        <Link href="/speaking" className="underline">Back to Speaking</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
      {/* Sticky block: header + actions bar */}
      <div className="sticky top-0 z-30 -mx-4 mb-4 bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6">
        <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <Link
              href="/speaking"
              className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3" aria-hidden="true" /> Back to Speaking
            </Link>
            <h1 className="truncate text-lg font-semibold leading-tight sm:text-xl">{lesson.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className={cn("rounded px-1.5 py-0.5 font-semibold", LEVEL_COLORS[lesson.level])}>
                {lesson.level}
              </span>
              {lesson.tags.map((t) => (
                <span key={t} className="text-muted-foreground">#{t}</span>
              ))}
            </div>
          </div>
        </header>
        {/* Actions bar: playback (left) + hint toggles + practice controls */}
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <InlinePlaybackBar
              lessonId={lesson.id}
              cdnBase={`${lesson.audio.cdnBase}/sentences`}
              manifestVersion={lesson.audio.manifestVersion}
              sentences={lesson.sentences}
              totalDurationMs={lesson.totalDurationMs}
            />
          </div>
          <HintSettingsPopover />
          <div ref={(el) => setControlsContainer(el)} className="flex flex-wrap items-center gap-2" />
        </div>
      </div>

      {/* Two-column layout: main | 320px sidebar */}
      <div className="flex flex-col gap-6 lg:flex-row">
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
    </div>
  );
}

export default function SpeakingDetailPage() {
  return (
    <Suspense>
      <DetailContent />
    </Suspense>
  );
}
