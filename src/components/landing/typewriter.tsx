"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Types `text` out one character at a time, with a blinking caret, the first
 * time it scrolls into view (so the hero animates on load). Inherits its colour
 * from the parent — wrap it in a coloured span and the typed text + caret pick
 * that colour up via `currentColor`.
 *
 * No layout shift: the not-yet-typed tail is always rendered (transparent), so
 * the full phrase reserves its final space up front and the surrounding heading
 * never reflows as characters land.
 *
 * Accessibility:
 * - A visually-hidden copy exposes the whole phrase to assistive tech, so it is
 *   announced once — not letter by letter. The animated part is `aria-hidden`.
 * - `prefers-reduced-motion` users skip the animation entirely: the full phrase
 *   shows immediately and the caret doesn't blink.
 *
 * Caret reuses the shared `cursor-blink` keyframe (globals.css), matching the
 * typing cursor in components/writing/ai-feedback-guide.tsx.
 */
export function Typewriter({
  text,
  className,
  speed = 60,
  startDelay = 500,
}: {
  text: string;
  className?: string;
  /** ms between characters */
  speed?: number;
  /** ms to wait after coming into view before the first character */
  startDelay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(0);

  // Start only once in view — mirrors the landing Reveal trigger, so a hero
  // that's on-screen at load begins immediately and a scrolled-past one never
  // stays stuck un-typed.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    let charTimer: ReturnType<typeof setTimeout>;

    // Reduced motion: reveal the whole phrase at once, no per-character timers.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      charTimer = setTimeout(() => setCount(text.length), 0);
      return () => clearTimeout(charTimer);
    }

    let i = 0;
    const tick = () => {
      i += 1;
      setCount(i);
      if (i < text.length) charTimer = setTimeout(tick, speed);
    };
    const startTimer = setTimeout(tick, startDelay);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(charTimer);
    };
  }, [started, text, speed, startDelay]);

  const typed = text.slice(0, count);
  const rest = text.slice(count);

  return (
    <span ref={ref} className={cn("whitespace-pre-wrap", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {typed}
        <span
          className="ml-px inline-block h-[0.85em] w-[0.5ch] max-w-[0.2em] translate-y-[0.08em] bg-current align-baseline"
          style={{ animation: "cursor-blink 1s step-end infinite" }}
        />
        <span className="text-transparent">{rest}</span>
      </span>
    </span>
  );
}
