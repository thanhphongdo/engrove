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

type Tab = "listen" | "practice";

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
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (hasBlobs && !confirm("Clear recorded turns and swap role?")) return;
    onChange(next);
  }
  return (
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
  );
}

function DetailContent() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading, error } = useSpeakingLesson(lessonId);

  const [tab, setTab] = useState<Tab>("listen");
  const [role, setRole] = useState<string>("");
  const [hasDraftBlobs, setHasDraftBlobs] = useState(false);

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
      {/* Sticky header */}
      <header className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Link href="/speaking" className="shrink-0 rounded-md p-1 hover:bg-accent" aria-label="Back to Speaking">
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className={cn("shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase", LEVEL_COLORS[lesson.level])}>
            {lesson.level}
          </span>
          <h1 className="truncate text-sm font-semibold">{lesson.title}</h1>
        </div>
        <RoleDropdown
          role={role}
          characters={lesson.characters}
          voices={lesson.voices}
          hasBlobs={hasDraftBlobs}
          onChange={(next) => { setRole(next); setHasDraftBlobs(false); }}
        />
        {/* Tab switcher */}
        <div className="flex rounded-md border">
          {(["listen", "practice"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors first:rounded-l-md last:rounded-r-md",
                tab === t ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Two-column layout: main | 320px sidebar */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          {tab === "listen" ? (
            <SampleListenTab lesson={lesson} />
          ) : (
            <PracticeSession lesson={lesson} role={role} />
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
