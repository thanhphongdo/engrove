"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  MessageSquare,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocalStorageBoolean } from "@/lib/use-local-storage";
import { cn } from "@/lib/utils";

/* ─── Mini illustrations ─────────────────────────────────────── */

function IllustrationWrite() {
  return (
    <div className="w-full rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold">Your writing</span>
        <span className="rounded border px-1.5 py-0.5 text-[9px] text-muted-foreground">
          Copy text
        </span>
      </div>
      <div className="min-h-[72px] rounded border bg-background p-2 text-[11px] leading-relaxed text-muted-foreground">
        <span className="text-foreground">
          Climate change poses significant challenges to modern societies.
          Governments must act swiftly
        </span>
        <span
          className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-[1px] bg-primary"
          style={{ animation: "cursor-blink 1s step-end infinite" }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">
          14 words · target 220–400
        </span>
        <span className="text-[9px] text-muted-foreground">
          Done?{" "}
          <span className="font-semibold text-foreground">Get AI feedback</span>{" "}
          below ↓
        </span>
      </div>
    </div>
  );
}

function IllustrationButton() {
  return (
    <div className="flex w-full flex-col items-stretch gap-1.5">
      <div className="w-full rounded border border-dashed border-muted p-1.5 text-center text-[9px] text-muted-foreground">
        ···  writing area  ···
      </div>
      <div className="rounded-md border-2 border-primary/40 bg-primary/5 p-2 dark:bg-primary/10">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Sparkles className="size-3 text-primary" />
          <span className="text-[11px] font-semibold">
            Get AI feedback on your writing
          </span>
        </div>
        <div className="relative inline-flex">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">
            <Copy className="size-2.5" />
            Copy prompt for ChatGPT / Gemini
          </span>
          <span className="absolute -inset-0.5 animate-ping rounded-md bg-primary opacity-25" />
        </div>
        <div className="my-1.5 flex items-center gap-1.5">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
            or skip the copy/paste
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border bg-background/60 px-2 py-1 text-[10px] font-medium text-foreground">
          <Wand2 className="size-2.5 text-primary" />
          Get feedback directly
        </span>
      </div>
    </div>
  );
}

function IllustrationPaste() {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex flex-1 flex-col items-center gap-1 rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
          <Copy className="size-4 text-primary" />
        </div>
        <p className="text-[11px] font-semibold">Prompt copied</p>
        <p className="text-[9px] text-muted-foreground">to clipboard</p>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <div style={{ animation: "slide-right 1s ease-in-out infinite" }}>
          <ArrowRight className="size-5 text-primary" />
        </div>
        <span className="text-[9px] text-muted-foreground">Ctrl+V</span>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1 rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10">
          <MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-[11px] font-semibold">ChatGPT / Gemini</p>
        <p className="text-[9px] text-muted-foreground">Paste → Send</p>
      </div>
    </div>
  );
}

function IllustrationResult() {
  const badges = [
    {
      label: "Overall",
      score: "8.5",
      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      delay: "0ms",
    },
    {
      label: "Grammar",
      score: "9.0",
      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      delay: "120ms",
    },
    {
      label: "Vocabulary",
      score: "7.5",
      cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      delay: "240ms",
    },
    {
      label: "Coherence",
      score: "8.0",
      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      delay: "360ms",
    },
  ];

  return (
    <div className="w-full rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <CheckCircle2 className="size-4 text-emerald-500" />
        <span className="text-[11px] font-semibold">AI feedback</span>
        <span className="ml-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-300">
          Saved ✓
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {badges.map((b) => (
          <span
            key={b.label}
            className={cn(
              "inline-flex items-baseline gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
              b.cls,
            )}
            style={{
              animation: `badge-pop 0.4s ease forwards`,
              animationDelay: b.delay,
              opacity: 0,
            }}
          >
            <span className="font-semibold">{b.label}</span>
            <span>{b.score}/10</span>
          </span>
        ))}
      </div>
      <div className="rounded border p-1.5 text-[10px]">
        <span className="text-rose-600 line-through dark:text-rose-400">
          Climate change are
        </span>{" "}
        →{" "}
        <span className="text-emerald-700 dark:text-emerald-300">
          Climate change is
        </span>
        <p className="mt-0.5 text-[9px] text-muted-foreground">
          Subject-verb agreement
        </p>
      </div>
    </div>
  );
}

/* ─── Step definitions ───────────────────────────────────────── */

const STEPS = [
  {
    label: "Write",
    title: "Write your response",
    description:
      "Use the writing area to craft your answer. The word count updates as you type — aim for the target range shown below the editor.",
    illustration: <IllustrationWrite />,
  },
  {
    label: "Get feedback",
    title: "Pick how to get AI feedback",
    description:
      "Two paths below the editor. Recommended: “Copy prompt for ChatGPT / Gemini” — uses your own AI tab, best quality especially for B2–C1. Or one-click: “Get feedback directly” — instant, no setup, great for A1–B1.",
    illustration: <IllustrationButton />,
  },
  {
    label: "Paste prompt",
    title: "If you copied: paste into ChatGPT or Gemini",
    description:
      "Open ChatGPT or Gemini in any tab, paste the prompt (Ctrl+V / Cmd+V), and hit Send. The AI replies with a JSON block — copy that JSON. (Skip this step if you used “Get feedback directly”.)",
    illustration: <IllustrationPaste />,
  },
  {
    label: "Paste back",
    title: "Paste the JSON back — see your scores",
    description:
      "Paste the AI's JSON into the panel below the copy button, then click Submit. Scores, corrections, and suggestions appear instantly. Every attempt is saved on this device, so you can compare past tries in the history below.",
    illustration: <IllustrationResult />,
  },
] as const;

/* ─── Main component ─────────────────────────────────────────── */

export function AiFeedbackGuide() {
  const [dismissed, setDismissed] = useLocalStorageBoolean(
    "writing-ai-guide-v3",
    false,
  );
  // The walkthrough auto-opens on first visit; afterwards the banner lets the
  // learner reopen it on demand. `dismissed` (persisted) hides both for good.
  const [open, setOpen] = useState(!dismissed);
  const [step, setStep] = useState(0);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  function handleNext() {
    if (isLast) {
      setDismissed(true);
      setOpen(false);
    } else {
      setStep((s) => s + 1);
    }
  }

  function openGuide() {
    setStep(0);
    setOpen(true);
  }

  return (
    <>
      {!dismissed && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border-l-4 border-emerald-400 bg-neutral-100/60 px-4 py-3 text-sm dark:bg-white/5">
          <span className="shrink-0 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <span className="flex-1 text-emerald-800 dark:text-emerald-300">
            New here? Learn how to use AI feedback to improve your writing faster.
          </span>
          <button
            type="button"
            onClick={openGuide}
            className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
          >
            Show guide
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss guide"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-sm gap-0 overflow-hidden p-0 sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3 pr-10">
          <Sparkles className="size-4 text-primary" />
          <DialogTitle className="text-sm font-semibold">How to use AI Feedback</DialogTitle>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 px-4 pt-3">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step
                  ? "w-6 bg-primary"
                  : i < step
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted-foreground/25",
              )}
              aria-label={`Step ${i + 1}: ${s.label}`}
            />
          ))}
        </div>

        {/* Illustration — fixed height so dialog never resizes */}
        <div className="mx-4 mt-4 h-[180px] overflow-hidden">
          <div
            key={step}
            className="animate-in fade-in slide-in-from-right-4 duration-300 flex h-full items-center justify-center"
          >
            {current.illustration}
          </div>
        </div>

        {/* Text — fixed height so dialog never resizes */}
        <div className="h-[110px] overflow-hidden px-4 pt-3">
          <div
            key={`text-${step}`}
            className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-1"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </p>
            <h3 className="text-base font-semibold leading-snug">{current.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {current.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-4 pt-3">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Don&apos;t show again
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronLeft className="size-3.5" />
                Back
              </Button>
            )}
            <Button type="button" size="sm" onClick={handleNext}>
              {isLast ? (
                <>
                  <CheckCircle2 className="mr-1 size-3.5" />
                  Got it!
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-1 size-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}
