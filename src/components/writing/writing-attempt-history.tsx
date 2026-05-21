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

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString();
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

  return (
    <section className="mt-6 rounded-md border bg-card p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Past attempts</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Reset progress
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
      <ul className="space-y-3">
        {[...attempts].reverse().map((a) => (
          <li key={a.id} className="rounded border p-3">
            <p className="text-xs text-muted-foreground">
              {fmtDate(a.completedAt)}
              {a.sampleRevealed && " · sample viewed"}
              {" · MC "}
              {a.mcScore}/{a.mcTotal}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Show my text + feedback
              </summary>
              <div className="mt-2 space-y-2">
                <p className="whitespace-pre-wrap rounded bg-muted/40 p-2 text-sm">
                  {a.text}
                </p>
                {a.llmResult && <WritingResultPanel result={a.llmResult} />}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
