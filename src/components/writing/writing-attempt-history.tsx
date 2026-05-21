"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  listWritingAttemptsForLesson,
  resetWritingProgress,
} from "@/lib/db/queries";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
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

function scoreColor(v: number): string {
  if (v >= 8) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (v >= 5) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
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
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Past attempts
          <span className="ml-1.5 text-xs font-normal">({attempts.length})</span>
        </h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
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

      <ul className="divide-y rounded-md border">
        {sorted.map((a, idx) => (
          <li key={a.id}>
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 hover:bg-muted/40">
                <span className="text-xs text-muted-foreground tabular-nums">{fmtDate(a.completedAt)}</span>
                {a.llmResult && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    scoreColor(a.llmResult.scores.overall),
                  )}>
                    {a.llmResult.scores.overall.toFixed(1)}/10
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  MC {a.mcScore}/{a.mcTotal}
                </span>
                {a.sampleRevealed && (
                  <span className="text-[10px] text-muted-foreground">· sample</span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground select-none">
                  {idx === 0 ? "latest" : `#${sorted.length - idx}`}
                </span>
              </summary>

              <div className="border-t px-3 py-3 space-y-3">
                <p className="whitespace-pre-wrap rounded bg-muted/40 px-3 py-2 text-sm leading-relaxed">
                  {a.text}
                </p>
                {a.llmResult && <WritingResultPanel result={a.llmResult} variant="inline" />}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
