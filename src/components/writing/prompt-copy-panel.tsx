"use client";

import { useRef, useState } from "react";
import { Copy, KeyRound, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { writingLLMResultSchema } from "@/lib/writing/result-schema";
import { buildPasteBackPrompt, buildLLMPrompt } from "@/lib/writing/prompt";
import { useWritingSession } from "./writing-session";
import { saveWritingAttempt, deleteWritingDraft } from "@/lib/db/queries";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import { scoreQuiz } from "@/lib/lessons/score";
import { useLocalStorageString, useLocalStorageBoolean } from "@/lib/use-local-storage";
import { AiModelWarningModal } from "./ai-model-warning";

type Provider = "gemini" | "chatgpt" | "groq";

const PROVIDERS: { id: Provider; label: string; placeholder: string; prefix: string; keyUrl: string }[] = [
  { id: "gemini",  label: "Gemini",  placeholder: "AIza…", prefix: "AIza", keyUrl: "https://aistudio.google.com/apikey" },
  { id: "chatgpt", label: "ChatGPT", placeholder: "sk-…",  prefix: "sk-",  keyUrl: "https://platform.openai.com/api-keys" },
  { id: "groq",    label: "Groq",    placeholder: "gsk_…", prefix: "gsk_", keyUrl: "https://console.groq.com/keys" },
];

function extractJsonBlock(s: string): string | null {
  const fenced = s.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = s.indexOf("{"), last = s.lastIndexOf("}");
  if (first >= 0 && last > first) return s.slice(first, last + 1);
  return null;
}

export function PromptCopyPanel() {
  const profileId = useActiveProfileId();
  const { lesson, text, mcPicks, sampleRevealed, applyResult, startSession, phase, cancelSession } = useWritingSession();

  const [pasteBack, setPasteBack] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(false);
  const [copying, setCopying] = useState(false);
  const [pasteBackOpen, setPasteBackOpen] = useState(false);
  const [pasteBackAnimKey, setPasteBackAnimKey] = useState(0);
  const pasteBackRef = useRef<HTMLDetailsElement>(null);

  const [geminiKey,  setGeminiKey]  = useLocalStorageString<string>("ai-key-gemini",  "");
  const [chatgptKey, setChatgptKey] = useLocalStorageString<string>("ai-key-chatgpt", "");
  const [groqKey,    setGroqKey]    = useLocalStorageString<string>("ai-key-groq",    "");
  const [rawProvider, setRawProvider] = useLocalStorageString<string>("ai-provider", "groq");
  const [warningDismissed] = useLocalStorageBoolean("ai-model-warning-v1", false);

  const provider = (PROVIDERS.find((p) => p.id === rawProvider)?.id ?? "groq") as Provider;
  const config = PROVIDERS.find((p) => p.id === provider)!;
  const keyByProvider: Record<Provider, string> = { gemini: geminiKey, chatgpt: chatgptKey, groq: groqKey };
  const userKey = keyByProvider[provider];

  function setActiveKey(v: string) {
    if (provider === "gemini") setGeminiKey(v);
    else if (provider === "chatgpt") setChatgptKey(v);
    else setGroqKey(v);
  }

  const pasteBackPrompt = buildPasteBackPrompt({ lesson, userText: text });

  async function handleSaveResult(result: ReturnType<typeof writingLLMResultSchema.parse>) {
    const mcResult = scoreQuiz(lesson.mcQuestions, mcPicks);
    const id = globalThis.crypto?.randomUUID?.() ?? `att-${Date.now()}`;
    await saveWritingAttempt({
      id, profileId, lessonId: lesson.id,
      startedAt: Date.now(), completedAt: Date.now(), durationMs: 0,
      text, mcScore: mcResult.score, mcTotal: mcResult.total,
      mcPicks, llmResult: result, sampleRevealed,
    });
    await deleteWritingDraft(profileId, lesson.id);
    applyResult(result);
    toast.success("Feedback received!");
  }

  /* ── Primary: copy prompt for ChatGPT / Gemini (Firebase relay) ── */
  async function copyRelayPrompt() {
    if (!text.trim()) { toast.error("Write something first."); return; }
    setCopying(true);
    try {
      const cb = await startSession();
      if (!cb) {
        const prompt = buildPasteBackPrompt({ lesson, userText: text });
        await navigator.clipboard.writeText(prompt);
        toast.warning("Auto-feedback unavailable — prompt copied. Paste it into ChatGPT or Gemini, then paste the response back below.", { duration: 8000 });
        openPasteBack();
        return;
      }
      const prompt = buildLLMPrompt({ lesson, userText: text, callbackUrl: cb });
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copied — paste into ChatGPT or Gemini, then wait for results here.");
    } finally {
      setCopying(false);
    }
  }

  /* ── Secondary: direct API (Groq / own key) ── */
  async function doGetAiFeedback() {
    if (!text.trim()) { toast.error("Write something first."); return; }
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (userKey) headers["x-ai-key"] = userKey;

      const res = await fetch("/api/writing/gemini-feedback", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: pasteBackPrompt, provider }),
      });

      if (res.status === 429) {
        const data = await res.json();
        if (data.error === "quota_exceeded") {
          toast.error(
            userKey ? "Your API key hit its rate limit. Wait and try again." : "Rate limit reached. Add your own API key.",
            { duration: 8000 },
          );
          if (!userKey) setShowKeyInput(true);
        } else {
          toast.error(`Too many requests. Try again in ${data.retryAfter}s.`, { duration: 6000 });
        }
        return;
      }
      if (res.status === 401) {
        toast.error("Invalid API key. Please check and re-enter it.");
        setActiveKey(""); setShowKeyInput(true);
        return;
      }
      if (res.status === 503) { toast.error("AI feedback is not configured on this server."); return; }
      if (!res.ok) { toast.error("Something went wrong. Try copying the prompt manually."); return; }

      const { result } = await res.json();
      await handleSaveResult(result);
    } catch {
      toast.error("Something went wrong. Try copying the prompt manually.");
    } finally {
      setLoading(false);
    }
  }

  function getAiFeedback() {
    if (!userKey && !warningDismissed) {
      setPendingFeedback(true);
      setWarningOpen(true);
    } else {
      doGetAiFeedback();
    }
  }

  /* ── Paste-back ── */
  async function submitPasteBack() {
    const raw = extractJsonBlock(pasteBack);
    if (!raw) { toast.error("Couldn't find a JSON block in the pasted response."); return; }
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { toast.error("Invalid JSON."); return; }
    const result = writingLLMResultSchema.safeParse(parsed);
    if (!result.success) { toast.error("Pasted JSON does not match the expected shape."); return; }
    await handleSaveResult(result.data);
    setPasteBack("");
  }

  function saveKey() {
    const trimmed = keyDraft.trim();
    if (!trimmed.startsWith(config.prefix)) {
      toast.error(`That doesn't look like a valid ${config.label} key (should start with ${config.prefix}…)`);
      return;
    }
    setActiveKey(trimmed);
    setKeyDraft(""); setShowKeyInput(false);
    toast.success(`${config.label} key saved!`);
  }

  function openPasteBack() {
    setPasteBackOpen(true);
    setPasteBackAnimKey((k) => k + 1);
    setTimeout(() => pasteBackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  }

  const isWaiting = phase === "waiting";

  return (
    <>
      <AiModelWarningModal
        open={warningOpen}
        onProceed={() => { setWarningOpen(false); if (pendingFeedback) { setPendingFeedback(false); doGetAiFeedback(); } }}
        onClose={() => { setWarningOpen(false); setPendingFeedback(false); }}
      />

      <section className="rounded-md border-2 border-primary/40 bg-primary/5 p-3 sm:p-4 shadow-md dark:bg-primary/10 dark:shadow-[0_4px_20px_rgba(255,255,255,0.035)]">

        {/* Header */}
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Get AI feedback on your writing</h2>
        </div>

        {/* ── PRIMARY: relay flow ── */}
        <p className="mb-3 text-xs text-muted-foreground">
          Copy the prompt, paste into <strong className="text-foreground">ChatGPT</strong> or <strong className="text-foreground">Gemini</strong> — your feedback will appear here automatically.
        </p>

        {isWaiting ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              <Loader2 className="size-3.5 animate-spin" />
              Waiting for AI response…
            </div>
            <button
              type="button"
              onClick={async () => { await cancelSession(); await copyRelayPrompt(); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="size-3" />
              Recopy
            </button>
          </div>
        ) : (
          <Button onClick={copyRelayPrompt} disabled={copying} className="gap-1.5">
            {copying ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
            {copying ? "Preparing…" : "Copy prompt for ChatGPT / Gemini"}
          </Button>
        )}

        {/* ── OR divider ── */}
        <div className="my-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] text-muted-foreground">or skip the copy/paste</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* ── SECONDARY: direct API ── */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={getAiFeedback} disabled={loading} variant="outline" size="sm" className="gap-1.5">
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {loading ? "Evaluating…" : "Get feedback directly"}
          </Button>
          {userKey ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300">
              <KeyRound className="size-2.5" />{config.label}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">uses Qwen3-32b (free, best for A1–B1)</span>
          )}
        </div>

        {/* ── Key section ── */}
        <div className="mt-3">
          {!showKeyInput && (
            <button
              type="button"
              onClick={() => { setShowKeyInput(true); setKeyDraft(userKey); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              <KeyRound className="size-3" />
              {userKey ? `Change your ${config.label} key` : "Add your own API key (better quality)"}
            </button>
          )}

          {showKeyInput && (
            <div className="mt-2 rounded-md border bg-card p-3 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Your API key</p>
                <button type="button" onClick={() => setShowKeyInput(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="flex gap-1">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setRawProvider(p.id); setKeyDraft(keyByProvider[p.id]); }}
                    className={cn(
                      "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors",
                      provider === p.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p.label}
                    {keyByProvider[p.id] && <span className="size-1.5 rounded-full bg-emerald-500" />}
                  </button>
                ))}
              </div>

              <p className="text-muted-foreground">
                Get a free key at{" "}
                <a href={config.keyUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                  {config.keyUrl.replace("https://", "")}
                </a>. Stored only on this device.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveKey()}
                  placeholder={config.placeholder}
                  className="flex-1 rounded border bg-background px-2 py-1 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
                />
                <Button type="button" size="sm" onClick={saveKey}>Save</Button>
              </div>
              {userKey && (
                <button
                  type="button"
                  onClick={() => { setActiveKey(""); setKeyDraft(""); setShowKeyInput(false); toast.success("Key removed"); }}
                  className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Remove {config.label} key
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Paste-back fallback ── */}
        <details
          ref={pasteBackRef}
          open={pasteBackOpen}
          onToggle={(e) => setPasteBackOpen(e.currentTarget.open)}
          className="mt-3 text-xs"
        >
          <summary className="cursor-pointer px-2 py-1 text-muted-foreground">
            Paste AI response manually
          </summary>
          <div key={pasteBackAnimKey} className={cn("mt-2 space-y-2 px-2 pb-2", pasteBackAnimKey > 0 && "animate-highlight-pulse")}>
            <textarea
              value={pasteBack}
              onChange={(e) => setPasteBack(e.target.value)}
              placeholder={'```json\n{ "scores": {...}, ... }\n```'}
              className="min-h-[6rem] w-full resize-y rounded border bg-background p-2 font-mono outline-none focus:ring-1 focus:ring-ring"
            />
            <Button onClick={submitPasteBack} size="sm" variant="outline">
              Submit pasted feedback
            </Button>
          </div>
        </details>

      </section>
    </>
  );
}
