import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

/** Loading / empty / populated states for a hub's lesson grid. */
export function LessonGrid({
  isLoading,
  isEmpty,
  emptyMessage,
  children,
}: {
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-white/15">
        {emptyMessage}
      </div>
    );
  }

  return <div className={GRID}>{children}</div>;
}
