"use client";

import { Button } from "@/components/ui/button";

export function ResumeBanner({ onAbandon }: { onAbandon: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-md border bg-secondary/40 px-3 py-2 text-sm">
      <span>Resumed your in-progress attempt.</span>
      <Button type="button" variant="ghost" size="sm" onClick={onAbandon}>
        Abandon and start over
      </Button>
    </div>
  );
}
