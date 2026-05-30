"use client";

import { useEffect, useRef } from "react";

// Dots ramping from faint to solid; the wave picks one per cell by amplitude.
const CHARS = "·∘○◯◌●◉";

/**
 * Ambient ASCII-dot wave rendered on a canvas behind the footer content
 * (ported from the Silicon Prime site). A grid of monospace dots whose glyph
 * and opacity flow through three layered sine/cosine waves over x, y and time.
 *
 * - Sits absolutely behind the footer at low opacity; `pointer-events-none`.
 * - Theme-aware: dots are near-black in light mode, near-white in dark.
 * - Only animates while the footer is on screen, and not at all for
 *   `prefers-reduced-motion` users.
 */
export function FooterWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let running = false;
    let time = 0;
    let rgb = "23, 23, 23"; // neutral-900

    const readColor = () => {
      rgb = document.documentElement.classList.contains("dark")
        ? "245, 245, 245" // neutral-100
        : "23, 23, 23";
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const cols = Math.floor(rect.width / 20);
      const rows = Math.floor(rect.height / 20);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = (x + 0.5) * (rect.width / cols);
          const py = (y + 0.5) * (rect.height / rows);

          const wave1 = Math.sin(x * 0.2 + time * 2) * Math.cos(y * 0.15 + time);
          const wave2 = Math.sin((x + y) * 0.1 + time * 1.5);
          const wave3 = Math.cos(x * 0.1 - y * 0.1 + time * 0.8);

          const normalized = ((wave1 + wave2 + wave3) / 3 + 1) / 2;
          const charIndex = Math.floor(normalized * (CHARS.length - 1));
          const alpha = 0.15 + normalized * 0.5;

          ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
          ctx.fillText(CHARS[charIndex], px, py);
        }
      }

      time += 0.03;
      raf = requestAnimationFrame(render);
    };

    const start = () => {
      if (!running) {
        running = true;
        render();
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    readColor();
    resize();
    window.addEventListener("resize", resize);

    const themeObserver = new MutationObserver(readColor);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Don't burn frames when the footer is scrolled out of view.
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    );
    io.observe(canvas);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      themeObserver.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-[0.18]">
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
