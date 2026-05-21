"use client";

import { useMemo } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
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
    <section className="rounded-md border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Your writing</h2>
        <button
          type="button"
          onClick={copyText}
          className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-accent"
        >
          <Copy className="size-3" aria-hidden="true" />
          Copy text
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your response here…"
        className="min-h-[10rem] w-full resize-y rounded border bg-background p-2 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-ring"
      />
      <p
        className={cn(
          "mt-1 text-xs",
          tooShort || tooLong ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        )}
      >
        {words} word{words === 1 ? "" : "s"}
        {min != null || max != null
          ? ` · target ${min ?? "?"}–${max ?? "?"}`
          : ""}
      </p>
    </section>
  );
}
