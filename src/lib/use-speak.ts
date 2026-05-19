"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeakState = "idle" | "speaking";

export function useSpeak() {
  const [state, setState] = useState<SpeakState>("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text: string, lang = "en-US") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;

    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => v.lang === lang) ??
      voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("idle");

    utteranceRef.current = utterance;
    setState("speaking");
    synth.speak(utterance);
  }, []);

  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  return { speak, state, supported };
}
