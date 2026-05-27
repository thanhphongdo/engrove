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
    <div className={cn("flex items-center gap-[3px]", className)} aria-hidden="true">
      {Array.from({ length: NUM_BARS }, (_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className="w-1 rounded-full bg-primary transition-transform duration-75"
          style={{ height: "1.5rem", transform: "scaleY(0.15)", transformOrigin: "center" }}
        />
      ))}
    </div>
  );
}
