"use client";

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWritingSession } from "./writing-session";

export function WritingResultWaiting() {
  const { cancelSession, expired, callbackUrl } = useWritingSession();
  return (
    <section className="rounded-md border border-dashed bg-card p-3 sm:p-4 text-sm shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 font-semibold">
          {expired ? (
            "This session expired — generate a new prompt."
          ) : (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Waiting for AI feedback…
            </>
          )}
        </p>
        <Button onClick={cancelSession} size="sm" variant="ghost" className="gap-1">
          <X className="size-3.5" aria-hidden="true" />
          Cancel & retry
        </Button>
      </div>
      {callbackUrl && !expired && (
        <p className="mt-2 break-all text-[0.7rem] text-muted-foreground">
          Listening on: <span className="font-mono">{callbackUrl}</span>
        </p>
      )}
    </section>
  );
}
