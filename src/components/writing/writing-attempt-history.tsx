"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  listWritingAttemptsForLesson,
  resetWritingProgress,
} from "@/lib/db/queries";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import { DetailCard } from "@/components/lesson/detail-card";
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
import { WritingResultPanel } from "./writing-result-panel";
import { cn } from "@/lib/utils";

function pillColor(v: number): string {
  if (v >= 8) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (v >= 5) return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
  return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300";
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function WritingAttemptHistory({ lessonId }: { lessonId: string }) {
  const profileId = useActiveProfileId();
  const attempts = useLiveQuery(
    () => listWritingAttemptsForLesson(profileId, lessonId),
    [profileId, lessonId],
  );
  if (!attempts || attempts.length === 0) return null;

  async function handleReset() {
    await resetWritingProgress(profileId, lessonId);
    toast.success("Writing progress reset");
  }

  const sorted = [...attempts].reverse();

  return (
    <DetailCard>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          Attempt history
          <span className="ml-1.5 text-xs font-normal text-neutral-500 dark:text-neutral-400">
            ({attempts.length})
          </span>
        </h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Reset
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset writing progress?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes all writing attempts and the in-progress draft for
                this lesson. Bookmarks and notes are kept. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="divide-y divide-neutral-100 dark:divide-white/5">
        {sorted.map((a, idx) => (
          <details key={a.id} className="group">
            <summary className="-mx-1 flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-white/5">
              <div className="min-w-0">
                <p className="text-[0.8rem] font-medium text-neutral-800 dark:text-neutral-200">
                  {fmtDate(a.completedAt)}
                  <span className="ml-1.5 text-neutral-400 dark:text-neutral-500">
                    {idx === 0 ? "· latest" : `· #${sorted.length - idx}`}
                  </span>
                </p>
                <p className="text-[0.75rem] text-neutral-500 dark:text-neutral-400">
                  {countWords(a.text)} words · MC {a.mcScore}/{a.mcTotal}
                  {a.sampleRevealed ? " · sample" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {a.llmResult && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold",
                      pillColor(a.llmResult.scores.overall),
                    )}
                  >
                    {a.llmResult.scores.overall.toFixed(1)}/10
                  </span>
                )}
                <ChevronDown
                  className="size-4 text-neutral-400 transition-transform group-open:rotate-180 dark:text-neutral-500"
                  aria-hidden="true"
                />
              </div>
            </summary>

            <div className="space-y-3 px-3 pb-3 pt-1">
              <p className="whitespace-pre-wrap rounded-xl bg-neutral-100/60 px-3 py-2 text-sm leading-relaxed text-neutral-700 dark:bg-white/5 dark:text-neutral-300">
                {a.text}
              </p>
              {a.llmResult && <WritingResultPanel result={a.llmResult} variant="inline" />}
            </div>
          </details>
        ))}
      </div>
    </DetailCard>
  );
}
