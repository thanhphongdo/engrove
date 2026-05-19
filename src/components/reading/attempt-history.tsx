"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listAttemptsForLesson } from "@/lib/db/queries";
import { useActiveProfileId } from "@/lib/db/use-active-profile";

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString();
}

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export function AttemptHistory({ lessonId }: { lessonId: string }) {
  const profileId = useActiveProfileId();
  const attempts = useLiveQuery(
    () => listAttemptsForLesson(profileId, lessonId),
    [profileId, lessonId],
  );
  if (!attempts || attempts.length === 0) return null;
  return (
    <section className="mt-6 rounded-md border bg-card p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <h2 className="mb-2 text-sm font-semibold">Attempt history</h2>
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
