"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNote, useSetNote } from "@/lib/db/use-notes";
import type { Note } from "@/lib/db/types";

/**
 * Wrapper: waits for the IndexedDB live query to resolve before mounting the
 * editor with its initial value. Inner editor owns local state and never
 * re-seeds from props (the wrapper's `key` remounts it if the lesson changes).
 */
export function LessonNotes({ lessonId }: { lessonId: string }) {
  const stored = useNote(lessonId);
  if (stored === undefined) return null; // still loading; render nothing for now
  return <NotesEditor key={lessonId} lessonId={lessonId} initial={stored ?? null} />;
}

function NotesEditor({
  lessonId,
  initial,
}: {
  lessonId: string;
  initial: Note | null;
}) {
  const setNote = useSetNote();
  const [text, setText] = useState(initial?.text ?? "");
  const [lastSavedText, setLastSavedText] = useState(initial?.text ?? "");
  const [expanded, setExpanded] = useState(Boolean(initial?.text));
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">(
    initial?.text ? "saved" : "idle",
  );

  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (text === lastSavedText) return;
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const toSave = text;
      setNote(lessonId, toSave)
        .then(() => {
          setLastSavedText(toSave);
          setSavingState("saved");
        })
        .catch(() => {});
    }, 1000);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [text, lastSavedText, lessonId, setNote]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setText(next);
    if (next !== lastSavedText) {
      setSavingState("saving");
    }
  }

  return (
    <section className="mt-6 rounded-md border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold hover:bg-accent/40"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="size-4" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-4" aria-hidden="true" />
        )}
        My notes
        {!expanded && lastSavedText.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">· saved</span>
        )}
      </button>
      <div className={cn("px-4 pb-4", !expanded && "hidden")}>
        <textarea
          value={text}
          onChange={handleChange}
          placeholder="Anything to remember about this lesson? Vocabulary, tricky grammar, ideas to revisit…"
          rows={4}
          className="w-full resize-y rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {savingState === "saving" ? "Saving…" : savingState === "saved" ? "Saved" : ""}
        </p>
      </div>
    </section>
  );
}
