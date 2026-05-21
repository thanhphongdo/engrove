"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocalStorageBoolean } from "@/lib/use-local-storage";

interface Props {
  open: boolean;
  onProceed: () => void;
  onClose: () => void;
}

export function useAiModelWarning() {
  return useLocalStorageBoolean("ai-model-warning-v1", false);
}

export function AiModelWarningModal({ open, onProceed, onClose }: Props) {
  const [, setDismissed] = useLocalStorageBoolean("ai-model-warning-v1", false);
  const [doNotShow, setDoNotShow] = useState(false);

  function handleProceed() {
    if (doNotShow) setDismissed(true);
    onProceed();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
            Free model — limited feedback quality
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Without your own API key, feedback uses{" "}
            <strong className="text-foreground">Qwen3-32b</strong> (Groq free tier).
          </p>
          <p>
            This works reasonably well for <strong className="text-foreground">A1–B1</strong> but may give inaccurate corrections and inflated scores at B2–C1. For better results, add your own{" "}
            <strong className="text-foreground">Gemini</strong> or{" "}
            <strong className="text-foreground">ChatGPT</strong> key below.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={doNotShow}
            onChange={(e) => setDoNotShow(e.target.checked)}
            className="rounded"
          />
          Don&apos;t show this again
        </label>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleProceed}>
            Got it, proceed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
