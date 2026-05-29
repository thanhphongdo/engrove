"use client";

import { useEffect, useState } from "react";
import { Check, Hand, Mic, Zap, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SpeakingVoice } from "@/lib/lessons/speaking-schema";

export type RecordMode = "manual" | "auto";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: [string, string];
  voices: Record<string, SpeakingVoice>;
  initialRole: string;
  initialMode: RecordMode;
  initialRemember: boolean;
  /** True when the user has practised before — shows the "restored choices" hint. */
  hadPrevious: boolean;
  onStart: (opts: { role: string; mode: RecordMode; remember: boolean }) => void;
};

function OptionCard({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: React.ReactNode;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-1 flex-col gap-1 rounded-xl border p-3 text-left transition-colors",
        selected ? "border-foreground ring-2 ring-foreground/15" : "hover:bg-accent",
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
      {selected && <Check className="absolute right-2.5 top-2.5 size-4" aria-hidden="true" />}
    </button>
  );
}

export function PracticeOptionsDialog({
  open,
  onOpenChange,
  characters,
  voices,
  initialRole,
  initialMode,
  initialRemember,
  hadPrevious,
  onStart,
}: Props) {
  const [role, setRole] = useState(initialRole);
  const [mode, setMode] = useState<RecordMode>(initialMode);
  const [remember, setRemember] = useState(initialRemember);

  // Re-sync from the latest saved choices each time the dialog opens (auto-fill).
  useEffect(() => {
    if (open) {
      setRole(initialRole);
      setMode(initialMode);
      setRemember(initialRemember);
    }
  }, [open, initialRole, initialMode, initialRemember]);

  function voiceLabel(c: string) {
    const v = voices[c];
    if (!v) return c;
    return v.sex === "female" ? "Female voice (F)" : "Male voice (M)";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Practice setup</DialogTitle>
          <DialogDescription>Choose your role and recording mode before you start.</DialogDescription>
        </DialogHeader>

        {hadPrevious && (
          <div className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <RotateCcw className="size-3" aria-hidden="true" /> Restored your last choices.
          </div>
        )}

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Your role</p>
          <div className="flex gap-2.5">
            {characters.map((c) => (
              <OptionCard
                key={c}
                selected={role === c}
                onClick={() => setRole(c)}
                title={c}
                desc={voiceLabel(c)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Recording mode</p>
          <div className="flex gap-2.5">
            <OptionCard
              selected={mode === "manual"}
              onClick={() => setMode("manual")}
              title={<><Hand className="size-3.5" aria-hidden="true" /> Manual</>}
              desc="You tap Record / Finish on each turn"
            />
            <OptionCard
              selected={mode === "auto"}
              onClick={() => setMode("auto")}
              title={<><Zap className="size-3.5" aria-hidden="true" /> Auto</>}
              desc="Mic starts automatically on your turn"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRemember((r) => !r)}
          className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3 text-left text-sm"
        >
          <span
            className={cn(
              "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded border",
              remember ? "border-foreground bg-foreground text-background" : "bg-background",
            )}
            aria-hidden="true"
          >
            {remember && <Check className="size-3" />}
          </span>
          <span>
            Remember &amp; don&apos;t ask again
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              Unchecked → the dialog shows next time but pre-fills these choices. Change anytime via Options.
            </span>
          </span>
        </button>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onStart({ role, mode, remember })}>
            <Mic className="size-4" aria-hidden="true" /> Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
