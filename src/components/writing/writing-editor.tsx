"use client";

import { useMemo } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { DetailCard } from "@/components/lesson/detail-card";
import { useWritingSession } from "./writing-session";
import { cn } from "@/lib/utils";

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function WritingEditor() {
  const { lesson, text, setText } = useWritingSession();
  const words = useMemo(() => countWords(text), [text]);
  const min = lesson.minWords;
  const max = lesson.maxWords;
  const tooShort = min != null && words < min;
  const tooLong = max != null && words > max;

  async function copyText() {
    if (!text) {
      toast.error("Write something first.");
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success("Copied your text");
  }

  return (
    <DetailCard>
      <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        Your writing
      </h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder="Start writing here…"
        className="w-full resize-y rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-800 placeholder-neutral-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder-neutral-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
      />
      <div className="mt-2 flex items-center justify-between gap-2 text-[0.8rem] text-neutral-500 dark:text-neutral-400">
        <span className={cn(tooShort || tooLong ? "text-amber-600 dark:text-amber-400" : undefined)}>
          {words} word{words === 1 ? "" : "s"}
          {min != null || max != null ? ` · target ${min ?? "?"}–${max ?? "?"}` : ""}
        </span>
        <button
          type="button"
          onClick={copyText}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-white/5"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          Copy text
        </button>
      </div>
    </DetailCard>
  );
}
