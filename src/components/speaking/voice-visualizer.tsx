"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = { getRmsLevel: () => number; active: boolean; className?: string };

const NUM_BARS = 5;

export function VoiceVisualizer({ getRmsLevel, active, className }: Props) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!active) {
      barsRef.current.forEach((b) => { if (b) b.style.transform = "scaleY(0.15)"; });
      return;
    }
    let rafId: number;
    const animate = () => {
      const level = getRmsLevel();
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const wave = Math.sin(Date.now() / 150 + i * 0.8) * 0.2;
        const scale = Math.max(0.15, Math.min(1, level * 0.9 + wave * level + 0.1));
        bar.style.transform = `scaleY(${scale})`;
      });
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [active, getRmsLevel]);

  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-hidden="true">
      {Array.from({ length: NUM_BARS }, (_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className="w-0.5 rounded-full bg-emerald-500 transition-transform duration-75 dark:bg-emerald-400"
          style={{ height: "1rem", transform: "scaleY(0.15)", transformOrigin: "center" }}
        />
      ))}
    </div>
  );
}
