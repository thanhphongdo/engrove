"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient "antigravity" particle field for the landing page.
 *
 * Ported from the standalone confetti.js into two self-contained fixed layers:
 *  - a base tint behind all content (carries the page's own background colour);
 *  - the particle canvas as a top-most overlay that floats above everything.
 *    It's `pointer-events-none`, so it never intercepts clicks/hover — the page
 *    underneath stays fully interactive.
 *
 * Colours are pulled from the live Tailwind theme rather than hard-coded, so
 * the field matches the app's emerald brand and re-tints automatically when
 * the user toggles dark mode. Honors `prefers-reduced-motion` (renders only
 * the static background, no particles, no animation).
 */

type RGB = [number, number, number];

// Brand palette expressed as Tailwind text-colour utilities so the actual
// resolved values come from the theme — never hard-coded hex. All emerald/green
// (the app's primary accent), with a deliberate light/dark split: deep, rich
// emeralds in light mode; brighter, more vivid ones in dark mode.
const PALETTE_LIGHT = [
  "text-emerald-600",
  "text-emerald-600",
  "text-emerald-700",
  "text-emerald-500",
  "text-green-600",
  "text-emerald-500",
];
const PALETTE_DARK = [
  "text-emerald-400",
  "text-emerald-400",
  "text-emerald-300",
  "text-emerald-500",
  "text-green-400",
  "text-emerald-300",
];

const CONFIG = {
  density: 10000, // px² of viewport per particle (~30% fewer than before)
  min: 25,
  max: 98,
  repel: 130, // cursor repel radius (px)
  force: 0.9, // cursor repel strength
};

/** Resolve Tailwind text-colour classes to concrete sRGB triples.
 *
 * Each computed colour is painted onto a 1×1 canvas and read back, so whatever
 * colour space the browser returns — Tailwind v4 hands back `lab()`/`oklch()`,
 * not `rgb()` — is converted to sRGB for us. (Parsing the string directly is
 * what the old code did, and it mangled `lab()` into a muddy olive.) */
function resolvePalette(classNames: string[]): RGB[] {
  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;left:-9999px;top:-9999px;width:0;height:0;";
  document.body.appendChild(probe);
  const swatch = document.createElement("canvas");
  swatch.width = swatch.height = 1;
  const sctx = swatch.getContext("2d");
  const out: RGB[] = [];
  if (sctx) {
    for (const cls of classNames) {
      probe.className = cls;
      sctx.clearRect(0, 0, 1, 1);
      sctx.fillStyle = "#10b981"; // emerald fallback if the browser rejects the colour
      sctx.fillStyle = getComputedStyle(probe).color;
      sctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = sctx.getImageData(0, 0, 1, 1).data;
      out.push([r, g, b]);
    }
  }
  probe.remove();
  return out.length ? out : [[16, 185, 129]];
}

export function ConfettiField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type Particle = {
      x: number;
      y: number;
      driftX: number;
      driftY: number;
      vx: number;
      vy: number;
      angle: number;
      spin: number;
      len: number;
      alpha: number;
      color: RGB;
    };

    let palette: RGB[] = [];
    const particles: Particle[] = [];
    let W = 0;
    let H = 0;
    let raf = 0;
    const mouse = { x: -9999, y: -9999, active: false };

    function readPalette() {
      palette = resolvePalette(
        document.documentElement.classList.contains("dark")
          ? PALETTE_DARK
          : PALETTE_LIGHT,
      );
      for (const p of particles)
        p.color = palette[(Math.random() * palette.length) | 0];
    }

    function makeParticle(): Particle {
      const speed = 0.12 + Math.random() * 0.28;
      const dir = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        driftX: Math.cos(dir) * speed,
        driftY: Math.sin(dir) * speed,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.04,
        len: 5 + Math.random() * 9,
        alpha: 0.15 + Math.random() * 0.26,
        color: palette[(Math.random() * palette.length) | 0] ?? [16, 185, 129],
      };
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(dpr, dpr);
      const target = Math.min(
        CONFIG.max,
        Math.max(CONFIG.min, Math.round((W * H) / CONFIG.density)),
      );
      if (particles.length < target) {
        while (particles.length < target) particles.push(makeParticle());
      } else if (particles.length > target) {
        particles.length = target;
      }
    }

    function onMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }
    function onLeave() {
      mouse.active = false;
    }

    function render() {
      ctx!.clearRect(0, 0, W, H);
      const repel2 = CONFIG.repel * CONFIG.repel;
      for (const p of particles) {
        p.vx += (p.driftX - p.vx) * 0.03;
        p.vy += (p.driftY - p.vy) * 0.03;

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < repel2) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / CONFIG.repel) * CONFIG.force;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
            p.angle += p.spin * 6;
          }
        }

        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;

        if (p.x < -20) p.x = W + 20;
        else if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20;
        else if (p.y > H + 20) p.y = -20;

        const hl = p.len / 2;
        const cos = Math.cos(p.angle) * hl;
        const sin = Math.sin(p.angle) * hl;
        ctx!.strokeStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${p.alpha})`;
        ctx!.lineWidth = 2;
        ctx!.lineCap = "round";
        ctx!.beginPath();
        ctx!.moveTo(p.x - cos, p.y - sin);
        ctx!.lineTo(p.x + cos, p.y + sin);
        ctx!.stroke();
      }
      raf = requestAnimationFrame(render);
    }

    readPalette();
    resize();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    const themeObserver = new MutationObserver(readPalette);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <>
      {/* Base page tint, behind all content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-neutral-50 dark:bg-neutral-950"
      />
      {/* Particles as the top-most layer — over everything, but click-through. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-100"
      >
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </>
  );
}
