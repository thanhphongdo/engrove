/**
 * Skill hub hero: title + subtitle on the left, a progress ring summarizing
 * completion on the right. Used by all four hubs.
 */
export function SkillHubHero({
  title,
  subtitle,
  done,
  total,
  verb = "completed",
  weekCount,
}: {
  title: string;
  subtitle: string;
  done: number;
  total: number;
  verb?: string;
  weekCount?: number;
}) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const dashoffset = 100 - percent;

  return (
    <section className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-4 rounded-2xl bg-neutral-100/60 p-3 pr-5 dark:bg-white/5">
        <div className="relative grid size-14 place-items-center">
          <svg className="size-14 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              className="stroke-neutral-200 dark:stroke-white/10"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              className="stroke-emerald-600"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="100"
              strokeDashoffset={dashoffset}
            />
          </svg>
          <span className="absolute text-xs font-bold">{percent}%</span>
        </div>
        <div className="text-sm">
          <p className="font-semibold">
            {done.toLocaleString()} / {total.toLocaleString()} {verb}
          </p>
          <p className="text-neutral-500">
            {weekCount && weekCount > 0 ? `${weekCount} this week · keep going!` : "Keep going!"}
          </p>
        </div>
      </div>
    </section>
  );
}
