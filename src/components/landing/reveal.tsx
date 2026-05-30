"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll- and load-reveal wrapper.
 *
 * Children start translated-down and transparent, then transition into place
 * the first time the element scrolls into view. Elements that are already in
 * the viewport on mount (e.g. the hero) animate immediately, which doubles as
 * the on-load entrance.
 *
 * - `delay` (ms) staggers siblings — pass an increasing value per item.
 * - Honors `prefers-reduced-motion`: the `data-reveal` attribute lets
 *   `globals.css` force these elements visible (no transform/transition) for
 *   reduced-motion users, so content is never trapped hidden.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Reveal when scrolled into view, or when the element has already been
        // scrolled past (top < 0) — so a jump (anchor link, scroll restore,
        // fast flick) never leaves a skipped section stuck hidden.
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out will-change-[opacity,transform] motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
