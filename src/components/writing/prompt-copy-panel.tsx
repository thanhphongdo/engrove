"use client";

import { useState } from "react";
import { Copy, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { writingLLMResultSchema } from "@/lib/writing/result-schema";
import { buildLLMPrompt, buildPasteBackPrompt } from "@/lib/writing/prompt";
import { useWritingSession } from "./writing-session";
import {
  saveWritingAttempt,
  deleteWritingDraft,
} from "@/lib/db/queries";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import { scoreQuiz } from "@/lib/lessons/score";

function extractJsonBlock(s: string): string | null {
  const fenced = s.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return s.slice(firstBrace, lastBrace + 1);
  }
  return null;
}

export function PromptCopyPanel() {
  const profileId = useActiveProfileId();
  const {
    lesson,
    text,
    callbackUrl,
    sessionToken,
    startSession,
    mcPicks,
    sampleRevealed,
    applyResult,
  } = useWritingSession();
  const [pasteBack, setPasteBack] = useState("");

  async function copyPrompt() {
    if (!text.trim()) {
      toast.error("Write something first.");
      return;
    }
    if (!callbackUrl) {
      await startSession();
      toast.info("Session ready — click Copy prompt again.");
      return;
    }
    const prompt = buildLLMPrompt({ lesson, userText: text, callbackUrl });
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied — paste it into ChatGPT or Gemini");
  }

  async function copyPasteBackPrompt() {
    if (!text.trim()) {
      toast.error("Write something first.");
      return;
    }
    const prompt = buildPasteBackPrompt({ lesson, userText: text });
    await navigator.clipboard.writeText(prompt);
    toast.success("Paste-back prompt copied");
  }

  async function submitPasteBack() {
    const raw = extractJsonBlock(pasteBack);
    if (!raw) {
      toast.error("Couldn't find a JSON block in the pasted response.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      toast.error("Invalid JSON in pasted response.");
      return;
    }
    const result = writingLLMResultSchema.safeParse(parsed);
    if (!result.success) {
      toast.error("Pasted JSON does not match the expected shape.");
      return;
    }
    const mcResult = scoreQuiz(lesson.mcQuestions, mcPicks);
    const id = globalThis.crypto?.randomUUID?.() ?? `att-${Date.now()}`;
    await saveWritingAttempt({
      id,
      profileId,
      lessonId: lesson.id,
      startedAt: Date.now(),
      completedAt: Date.now(),
      durationMs: 0,
      text,
      mcScore: mcResult.score,
      mcTotal: mcResult.total,
      mcPicks,
      llmResult: result.data,
      sampleRevealed,
    });
    await deleteWritingDraft(profileId, lesson.id);
    applyResult(result.data);
    setPasteBack("");
    toast.success("Feedback saved");
  }

  return (
    <section className="rounded-md border bg-card p-3 sm:p-4 shadow-md dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">
      <h2 className="mb-2 text-sm font-semibold">Get AI feedback</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Copy the prompt below, paste it into ChatGPT or Gemini, and your feedback
        will show up here automatically when the model replies.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={copyPrompt} className="gap-1" size="sm">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {callbackUrl ? "Copy prompt + my text" : "Get AI feedback"}
        </Button>
        <Button
          onClick={copyPasteBackPrompt}
          variant="outline"
          className="gap-1"
          size="sm"
        >
          <Wand2 className="size-3.5" aria-hidden="true" />
          Copy paste-back prompt
        </Button>
      </div>
      {callbackUrl && (
        <p className="mt-3 break-all text-[0.7rem] text-muted-foreground">
          Callback URL: <span className="font-mono">{callbackUrl}</span>
          {sessionToken && (
            <>
              {" "}
              ·{" "}
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={async () => {
                  await navigator.clipboard.writeText(callbackUrl);
                  toast.success("Callback URL copied");
                }}
              >
                <Copy className="inline size-3" aria-hidden="true" /> copy
              </button>
            </>
          )}
        </p>
      )}
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          Or paste the AI's JSON response here
        </summary>
        <textarea
          value={pasteBack}
          onChange={(e) => setPasteBack(e.target.value)}
          placeholder='```json\n{ "scores": {...}, ... }\n```'
          className="mt-2 min-h-[6rem] w-full resize-y rounded border bg-background p-2 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          onClick={submitPasteBack}
          size="sm"
          variant="outline"
          className="mt-2"
        >
          Submit pasted feedback
        </Button>
      </details>
    </section>
  );
}
