"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { listAttemptsForLesson, resetLessonProgress } from "@/lib/db/queries";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import { useTimerStore } from "@/stores/timer-store";
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

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString();
}

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export function AttemptHistory({ lessonId }: { lessonId: string }) {
  const profileId = useActiveProfileId();
  const resetTimer = useTimerStore((s) => s.reset);
  const attempts = useLiveQuery(
    () => listAttemptsForLesson(profileId, lessonId),
    [profileId, lessonId],
  );
  if (!attempts || attempts.length === 0) return null;

  async function handleReset() {
    await resetLessonProgress(profileId, lessonId);
    resetTimer();
    toast.success("Lesson progress reset");
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Attempt history</h2>
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
              <AlertDialogTitle>Reset lesson progress?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes all attempts and any in-progress draft for this
                lesson, including your best score. Bookmarks, notes, and saved
                vocab are kept. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <table className="w-full text-xs">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 text-left font-medium">Date</th>
            <th className="py-1 text-left font-medium">Score</th>
            <th className="py-1 text-left font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {[...attempts].reverse().map((a) => (
            <tr key={a.id} className="border-t">
              <td className="py-1">{fmtDate(a.completedAt)}</td>
              <td className="py-1">{a.score}/{a.total}</td>
              <td className="py-1">{fmtDuration(a.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
