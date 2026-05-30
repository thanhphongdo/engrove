"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WritingLLMResult } from "@/lib/db/types";

function pillColor(v: number): string {
  if (v >= 8) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (v >= 5) return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
  return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300";
}

/** Sub-score rows turn amber when the score dips below 6. */
const LOW = 6;

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
  const subScores: [string, number][] = [
    ["Task response", s.task],
    ["Coherence & cohesion", s.coherence],
    ["Lexical resource", s.vocabulary],
    ["Grammatical range", s.grammar],
  ];

  const corrections = result.corrections.filter(
    (c) => normalizeForCompare(c.original) !== normalizeForCompare(c.fixed),
  );

  const isInline = variant === "inline";

  return (
    <section
      ref={ref}
      className={cn(
        isInline
          ? "space-y-3"
          : "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900",
      )}
    >
      <div className={cn("flex items-center justify-between", isInline ? "mb-2" : "mb-3")}>
        {!isInline ? (
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">AI feedback</h2>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            AI feedback
          </span>
        )}
        <span className={cn("rounded-full px-3 py-1 text-sm font-bold", pillColor(s.overall))}>
          {s.overall.toFixed(1)}/10
        </span>
      </div>

      {/* Score rows */}
      <div className="mb-4 space-y-2.5">
        {subScores.map(([label, v]) => {
          const low = v < LOW;
          return (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-[0.8rem]">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
                <span
                  className={cn(
                    "font-semibold",
                    low
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-700 dark:text-emerald-400",
                  )}
                >
                  {v.toFixed(1)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className={cn("h-2 rounded-full", low ? "bg-amber-400" : "bg-emerald-500")}
                  style={{ width: `${Math.max(0, Math.min(10, v)) * 10}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback bullets */}
      {(corrections.length > 0 || result.suggestions.length > 0) && (
        <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
          {result.suggestions.map((sug, i) => (
            <li key={`s-${i}`} className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true">
                ✓
              </span>
              <span>{sug}</span>
            </li>
          ))}
          {corrections.map((c, i) => (
            <li key={`c-${i}`} className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true">
                !
              </span>
              <span>
                <span className="text-rose-700 line-through dark:text-rose-300">{c.original}</span>
                {" → "}
                <span className="text-emerald-700 dark:text-emerald-300">{c.fixed}</span>
                {c.explanation && (
                  <span className="ml-1 text-neutral-500 dark:text-neutral-400">— {c.explanation}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Polished version */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowRewritten((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
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
          <p className="mt-2 rounded-xl bg-neutral-100/60 p-3 text-sm leading-relaxed text-neutral-700 dark:bg-white/5 dark:text-neutral-300">
            {result.rewritten}
          </p>
        )}
      </div>

      {!isInline && result.model && (
        <p className="mt-3 text-[0.7rem] text-neutral-400 dark:text-neutral-500">Model: {result.model}</p>
      )}
    </section>
  );
}
