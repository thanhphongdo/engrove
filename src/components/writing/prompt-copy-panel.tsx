"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { DetailCard } from "@/components/lesson/detail-card";
import { cn } from "@/lib/utils";
import { writingLLMResultSchema } from "@/lib/writing/result-schema";
import { buildPasteBackPrompt } from "@/lib/writing/prompt";
import { useWritingSession } from "./writing-session";
import { saveWritingAttempt, deleteWritingDraft } from "@/lib/db/queries";
import { useActiveProfileId } from "@/lib/db/use-active-profile";
import { scoreQuiz } from "@/lib/lessons/score";
import { useLocalStorageString } from "@/lib/use-local-storage";

type Provider = "gemini" | "chatgpt" | "groq";

const PROVIDERS: { id: Provider; label: string; placeholder: string; prefix: string; keyUrl: string }[] = [
  { id: "gemini",  label: "Gemini",  placeholder: "AIza…", prefix: "AIza", keyUrl: "https://aistudio.google.com/apikey" },
  { id: "chatgpt", label: "ChatGPT", placeholder: "sk-…",  prefix: "sk-",  keyUrl: "https://platform.openai.com/api-keys" },
  { id: "groq",    label: "Groq",    placeholder: "gsk_…", prefix: "gsk_", keyUrl: "https://console.groq.com/keys" },
];

/** Solid dark CTA shared with the rest of the lesson UI (matches QuizFooter). */
const DARK_BTN =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100";

function extractJsonBlock(s: string): string | null {
  const fenced = s.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = s.indexOf("{"), last = s.lastIndexOf("}");
  if (first >= 0 && last > first) return s.slice(first, last + 1);
  return null;
}

export function PromptCopyPanel() {
  const profileId = useActiveProfileId();
  const { lesson, text, mcPicks, sampleRevealed, applyResult } = useWritingSession();

  const [pasteBack, setPasteBack] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [copying, setCopying] = useState(false);
  const [pasteBackOpen, setPasteBackOpen] = useState(false);
  const [pasteBackAnimKey, setPasteBackAnimKey] = useState(0);
  const pasteBackRef = useRef<HTMLDetailsElement>(null);

  const [geminiKey,  setGeminiKey]  = useLocalStorageString<string>("ai-key-gemini",  "");
  const [chatgptKey, setChatgptKey] = useLocalStorageString<string>("ai-key-chatgpt", "");
  const [groqKey,    setGroqKey]    = useLocalStorageString<string>("ai-key-groq",    "");
  const [rawProvider, setRawProvider] = useLocalStorageString<string>("ai-provider", "groq");

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

  /* ── Primary: copy prompt for ChatGPT / Gemini (paste-back flow) ── */
  async function copyPrompt() {
    if (!text.trim()) { toast.error("Write something first."); return; }
    setCopying(true);
    try {
      const prompt = buildPasteBackPrompt({ lesson, userText: text });
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copied — paste it into ChatGPT or Gemini, then paste the JSON response back below.", { duration: 6000 });
      openPasteBack();
    } finally {
      setCopying(false);
    }
  }

  /* ── Secondary: direct API (server fallback for groq, user key for others) ── */
  async function getAiFeedback() {
    if (!text.trim()) { toast.error("Write something first."); return; }
    // Non-groq providers need a user key (server only has a Groq fallback)
    if (!userKey && provider !== "groq") { setShowKeyInput(true); return; }
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
        toast.error(
          userKey ? "Your API key hit its rate limit. Wait and try again." : "Free model hit its rate limit. Add your own API key for unlimited use.",
          { duration: 8000 },
        );
        if (!userKey) setShowKeyInput(true);
        return;
      }
      if (res.status === 401) {
        toast.error("Invalid API key. Please check and re-enter it.");
        setActiveKey(""); setShowKeyInput(true);
        return;
      }
      if (!res.ok) { toast.error("Something went wrong. Try copying the prompt manually."); return; }

      const { result } = await res.json();
      await handleSaveResult(result);
    } catch {
      toast.error("Something went wrong. Try copying the prompt manually.");
    } finally {
      setLoading(false);
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

  function toggleKeyInput() {
    setShowKeyInput((open) => {
      if (!open) setKeyDraft(userKey);
      return !open;
    });
  }

  return (
    <DetailCard>
      <h2 className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        Get AI feedback on your writing
      </h2>
      <p className="mb-3 text-[0.8rem] text-neutral-500 dark:text-neutral-400">
        Copy the prompt, paste it into ChatGPT or Gemini, then paste the JSON response back below.
      </p>

      {/* PRIMARY copy button */}
      <button type="button" onClick={copyPrompt} disabled={copying} className={DARK_BTN}>
        {copying ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {copying ? "Preparing…" : "Copy prompt for ChatGPT / Gemini"}
      </button>

      {/* Hairline divider */}
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-100 dark:bg-white/10" />
        <span className="text-[0.75rem] text-neutral-400 dark:text-neutral-500">— or skip the copy/paste —</span>
        <div className="h-px flex-1 bg-neutral-100 dark:bg-white/10" />
      </div>

      {/* Direct API area */}
      <div className="space-y-3">
        {/* Provider segmented control */}
        <div className="flex rounded-lg bg-neutral-100 p-0.5 dark:bg-white/10">
          {PROVIDERS.map((p) => {
            const active = provider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { setRawProvider(p.id); setKeyDraft(keyByProvider[p.id]); }}
                aria-pressed={active}
                className={cn(
                  "relative flex-1 rounded-md px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "bg-white font-semibold text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
                    : "font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
                )}
              >
                {p.label}
                {keyByProvider[p.id] && (
                  <span className="ml-1 inline-block size-1.5 -translate-y-px rounded-full bg-emerald-500" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {/* API key disclosure */}
        <div className="border-t border-neutral-100 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={toggleKeyInput}
            aria-expanded={showKeyInput}
            className="flex w-full items-center justify-between text-[0.8rem] font-medium text-neutral-700 dark:text-neutral-300"
          >
            <span>{userKey ? `Change your ${config.label} key` : "Add your own API key (better quality)"}</span>
            <ChevronDown
              className={cn("size-3.5 shrink-0 transition-transform", showKeyInput && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          {showKeyInput && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Your {config.label} API key
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveKey()}
                  placeholder={config.placeholder}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder-neutral-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={saveKey}
                  className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                >
                  Save
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <a
                  href={config.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[0.75rem] text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Get a key
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </a>
                {userKey && (
                  <button
                    type="button"
                    onClick={() => { setActiveKey(""); setKeyDraft(""); setShowKeyInput(false); toast.success("Key removed"); }}
                    className="text-[0.75rem] text-neutral-500 underline-offset-2 hover:text-foreground hover:underline dark:text-neutral-400"
                  >
                    Remove {config.label} key
                  </button>
                )}
              </div>
              <p className="text-[0.75rem] text-neutral-400 dark:text-neutral-500">Stored only on this device.</p>
            </div>
          )}
        </div>

        {/* Get feedback now */}
        <button type="button" onClick={getAiFeedback} disabled={loading} className={DARK_BTN}>
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
          {loading ? "Evaluating…" : "Get feedback now"}
        </button>
        {!userKey && provider === "groq" && (
          <p className="text-center text-[0.75rem] text-neutral-400 dark:text-neutral-500">
            uses Qwen3-32b (free, best for A1–B1)
          </p>
        )}
      </div>

      {/* Paste AI response manually */}
      <details
        ref={pasteBackRef}
        open={pasteBackOpen}
        onToggle={(e) => setPasteBackOpen(e.currentTarget.open)}
        className="group mt-4 border-t border-neutral-100 pt-3 dark:border-white/10"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between text-[0.8rem] font-medium text-neutral-600 dark:text-neutral-400">
          <span>Paste AI response manually</span>
          <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div
          key={pasteBackAnimKey}
          className={cn("mt-2 space-y-2", pasteBackAnimKey > 0 && "animate-highlight-pulse")}
        >
          <textarea
            value={pasteBack}
            onChange={(e) => setPasteBack(e.target.value)}
            rows={4}
            placeholder={'```json\n{ "scores": {...}, ... }\n```'}
            className="w-full resize-y rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-[0.75rem] leading-relaxed text-neutral-600 placeholder-neutral-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-400 dark:placeholder-neutral-600"
          />
          <button type="button" onClick={submitPasteBack} className={DARK_BTN}>
            Submit pasted feedback
          </button>
        </div>
      </details>
    </DetailCard>
  );
}
