"use client";

import { createElement, useMemo } from "react";
import {
  useReadingLessonsIndex,
  useWritingLessonsIndex,
  useListeningLessonsIndex,
  useSpeakingLessonsIndex,
} from "@/lib/lessons/load";
import { useLearningActivity } from "@/lib/db/use-learning-activity";
import { useStreak } from "@/lib/db/use-streak";
import { SKILL_META, hrefForLesson } from "@/lib/skills";
import { ContinueCard } from "@/components/shared/continue-card";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-neutral-500">{label}</p>
    </div>
  );
}

/**
 * The data-driven middle of the landing page:
 *  1. A catalogue stat strip (real numbers derived from the lesson indexes).
 *  2. A "welcome back" band that renders ONLY when the device has local
 *     progress — a first-time visitor never sees it (per product requirement).
 */
export function LandingDashboard() {
  const reading = useReadingLessonsIndex();
  const writing = useWritingLessonsIndex();
  const listening = useListeningLessonsIndex();
  const speaking = useSpeakingLessonsIndex();

  const activity = useLearningActivity();
  const streak = useStreak();

  const allMetas = useMemo(
    () => [
      ...(reading.data ?? []),
      ...(writing.data ?? []),
      ...(listening.data ?? []),
      ...(speaking.data ?? []),
    ],
    [reading.data, writing.data, listening.data, speaking.data],
  );

  const stats = useMemo(() => {
    const totalLessons = allMetas.length;
    const tags = new Set<string>();
    for (const m of allMetas) for (const t of m.tags) tags.add(t.toLowerCase());
    const audioMs = (listening.data ?? []).reduce(
      (sum, m) => sum + (m.totalDurationMs ?? 0),
      0,
    );
    const audioHours = Math.floor(audioMs / 3_600_000);
    return { totalLessons, topics: tags.size, audioHours };
  }, [allMetas, listening.data]);

  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of allMetas) map.set(m.id, m.title);
    return map;
  }, [allMetas]);

  const ready = stats.totalLessons > 0;

  const showBand = activity?.hasActivity || (streak.current ?? 0) > 0;

  return (
    <>
      {/* ===== Catalogue stat strip (real, content-derived) ===== */}
      <section className="border-y border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
          <Stat value={ready ? stats.totalLessons.toLocaleString() : "…"} label="Lessons, and growing" />
          <Stat value="A1 – C1" label="5 CEFR levels" />
          <Stat value={ready && stats.audioHours > 0 ? `${stats.audioHours}+ hrs` : "Native"} label="Native audio" />
          <Stat value={ready ? `${stats.topics}+` : "…"} label="Real-world topics" />
        </div>
      </section>

      {/* ===== Welcome-back band — returning learners only ===== */}
      {showBand && (
        <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Welcome back 👋</h2>
            <p className="text-sm text-neutral-500">
              {streak.current > 0 && (
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  🔥 {streak.current}-day streak
                </span>
              )}
              {streak.current > 0 && activity && activity.lessonsDone > 0 && " · "}
              {activity && activity.lessonsDone > 0 && (
                <span>{activity.lessonsDone} lessons done</span>
              )}
            </p>
          </div>
          {activity?.recent ? (
            <ContinueCard
              href={hrefForLesson(activity.recent.lessonId)}
              icon={createElement(SKILL_META[activity.recent.skill].icon, { className: "size-5" })}
              eyebrow="Pick up where you left off"
              title={
                titleById.get(activity.recent.lessonId) ??
                `${SKILL_META[activity.recent.skill].label} lesson`
              }
              progressLabel={SKILL_META[activity.recent.skill].label}
            />
          ) : (
            <ContinueCard
              href="/reading"
              icon={createElement(SKILL_META.reading.icon, { className: "size-5" })}
              eyebrow="Keep your streak going"
              title="Start your next lesson"
              progressLabel="Reading"
            />
          )}
        </section>
      )}
    </>
  );
}
