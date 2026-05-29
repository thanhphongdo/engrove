"use client";

import { Suspense, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useSpeakingLesson } from "@/lib/lessons/load";
import { SampleListenTab } from "@/components/speaking/sample-listen-tab";
import { PracticeSession } from "@/components/speaking/practice-session";
import { HintPanel } from "@/components/speaking/hint-panel";
import { RecordingsHistory } from "@/components/speaking/recordings-history";
import { HintSettingsPopover } from "@/components/reading/hint-settings-popover";
import { InlinePlaybackBar } from "@/components/listening/inline-playback-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SpeakingVoice } from "@/lib/lessons/speaking-schema";

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-level-a1 text-level-a1-foreground",
  A2: "bg-level-a2 text-level-a2-foreground",
  B1: "bg-level-b1 text-level-b1-foreground",
  B2: "bg-level-b2 text-level-b2-foreground",
  C1: "bg-level-c1 text-level-c1-foreground",
};

function RoleDropdown({
  role,
  characters,
  voices,
  hasBlobs,
  onChange,
}: {
  role: string;
  characters: [string, string];
  voices: Record<string, SpeakingVoice>;
  hasBlobs: boolean;
  onChange: (role: string) => void;
}) {
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (hasBlobs) { setPendingRole(next); return; }
    onChange(next);
  }

  return (
    <>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">You are:</span>
        <div className="relative">
          <select
            value={role}
            onChange={handleChange}
            className="appearance-none rounded-md border bg-background py-1 pl-2 pr-6 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {characters.map((c) => {
              const v = voices[c];
              const label = v ? `${c} (${v.sex === "female" ? "F" : "M"})` : c;
              return <option key={c} value={c}>{label}</option>;
            })}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
      <ConfirmDialog
        open={pendingRole !== null}
        onOpenChange={(open) => { if (!open) setPendingRole(null); }}
        title="Switch role?"
        description="This will clear all your recorded turns."
        confirmLabel="Switch"
        onConfirm={() => { onChange(pendingRole!); setPendingRole(null); }}
      />
    </>
  );
}

function DetailContent() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading, error } = useSpeakingLesson(lessonId);

  const [role, setRole] = useState<string>("");
  const [hasDraftBlobs, setHasDraftBlobs] = useState(false);
  const [controlsContainer, setControlsContainer] = useState<HTMLElement | null>(null);
  const [practiceActive, setPracticeActive] = useState(false);

  // Default role = characters[0] once lesson loads
  if (lesson && !role) setRole(lesson.characters[0]);

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
      {/* Sticky block: header + actions bar — matches reading layout */}
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
        {/* Actions bar: playback + role + practice controls all in one strip */}
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2 sm:px-6">
          <div className="min-w-0 flex-1">
            <InlinePlaybackBar
              lessonId={lesson.id}
              cdnBase={`${lesson.audio.cdnBase}/sentences`}
              manifestVersion={lesson.audio.manifestVersion}
              sentences={lesson.sentences}
              totalDurationMs={lesson.totalDurationMs}
            />
          </div>
          <RoleDropdown
            role={role}
            characters={lesson.characters}
            voices={lesson.voices}
            hasBlobs={hasDraftBlobs}
            onChange={(next) => { setRole(next); setHasDraftBlobs(false); }}
          />
          <HintSettingsPopover />
          <div ref={(el) => setControlsContainer(el)} className="flex flex-wrap items-center gap-2" />
        </div>
      </div>

      {/* Two-column layout: main | 320px sidebar */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-8">
          {!practiceActive && <SampleListenTab lesson={lesson} />}
          <PracticeSession
            lesson={lesson}
            role={role}
            controlsContainer={controlsContainer}
            onActiveChange={setPracticeActive}
          />
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
