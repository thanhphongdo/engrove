"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WritingLLMResult } from "@/lib/db/types";

function scoreColor(v: number): string {
  if (v >= 8) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (v >= 5) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
}

/**
 * Strip surrounding punctuation/whitespace and lowercase so corrections
 * that only differ in trailing/leading punctuation compare equal. Some
 * models (e.g. Qwen3-32B) occasionally return "corrections" where the
 * `original` and `fixed` strings are effectively identical — we drop
 * those before rendering.
 */
function normalizeForCompare(s: string): string {
  return s
    .normalize("NFC")
    .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

interface Props {
  result: WritingLLMResult;
  variant?: "full" | "inline";
}

export function WritingResultPanel({ result, variant = "full" }: Props) {
  const [showRewritten, setShowRewritten] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (variant === "full") {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [variant]);

  const s = result.scores;
  const entries: [string, number][] = [
    ["Overall", s.overall],
    ["Task", s.task],
    ["Grammar", s.grammar],
    ["Vocabulary", s.vocabulary],
    ["Coherence", s.coherence],
  ];

  const corrections = result.corrections.filter(
    (c) => normalizeForCompare(c.original) !== normalizeForCompare(c.fixed),
  );

  const isInline = variant === "inline";

  return (
    <section
      ref={ref}
      className={cn(
        "space-y-3",
        !isInline && "rounded-md border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]",
      )}
    >
      {!isInline && <h2 className="text-sm font-semibold">AI feedback</h2>}

      <div className="flex flex-wrap gap-1.5">
        {entries.map(([k, v]) => (
          <span
            key={k}
            className={cn(
              "inline-flex items-baseline gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              scoreColor(v),
            )}
          >
            <span className="font-semibold">{k}</span>
            <span>{v.toFixed(1)}/10</span>
          </span>
        ))}
      </div>

      {corrections.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Corrections
          </p>
          <ul className="space-y-1.5">
            {corrections.map((c, i) => (
              <li key={i} className={cn("text-sm", isInline ? "pl-0" : "rounded border p-2")}>
                {isInline ? (
                  <span>
                    <span className="text-rose-700 line-through dark:text-rose-300">{c.original}</span>
                    {" → "}
                    <span className="text-emerald-700 dark:text-emerald-300">{c.fixed}</span>
                    {c.explanation && (
                      <span className="ml-1 text-xs text-muted-foreground">— {c.explanation}</span>
                    )}
                  </span>
                ) : (
                  <>
                    <p>
                      <span className="text-rose-700 line-through dark:text-rose-300">{c.original}</span>
                      {" → "}
                      <span className="text-emerald-700 dark:text-emerald-300">{c.fixed}</span>
                    </p>
                    {c.explanation && (
                      <p className="mt-1 text-xs text-muted-foreground">{c.explanation}</p>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Suggestions
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {result.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowRewritten((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          aria-expanded={showRewritten}
        >
          Polished version
          {showRewritten ? (
            <ChevronUp className="size-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3" aria-hidden="true" />
          )}
        </button>
        {showRewritten && (
          <p className="mt-2 rounded bg-muted/40 p-2 text-sm leading-relaxed">
            {result.rewritten}
          </p>
        )}
      </div>

      {!isInline && result.model && (
        <p className="text-[0.7rem] text-muted-foreground">Model: {result.model}</p>
      )}
    </section>
  );
}
