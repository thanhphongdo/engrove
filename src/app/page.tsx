import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  Languages,
  Layers,
  Headphones,
  PenLine,
  Mic,
  ShieldCheck,
} from "lucide-react";
import { AppHeader } from "@/components/app-shell/app-header";
import { AppFooter } from "@/components/app-shell/app-footer";
import { LandingDashboard } from "@/components/landing/landing-dashboard";
import { SkillCards } from "@/components/landing/skill-cards";
import { ShareRow } from "@/components/landing/share-row";
import { ConfettiField } from "@/components/landing/confetti-field";
import { Reveal } from "@/components/landing/reveal";
import { Typewriter } from "@/components/landing/typewriter";
import { LevelBadge } from "@/components/shared/level-badge";
import { CEFR_LEVELS, LEVEL_DESCRIPTORS } from "@/lib/levels";

export const metadata: Metadata = {
  title: "Engrove — Learn English by living in it",
  description:
    "Real stories, native voices and AI feedback, broken into short lessons with Vietnamese help. 100% free, no ads, works offline, no account.",
};

const FREE_CHIPS = ["100% free", "No ads", "Works offline", "No account, ever"];

const FEATURES = [
  {
    icon: Layers,
    title: "Levelled A1 → C1",
    body: "Every lesson is tagged by CEFR level so you always work just above your comfort zone.",
  },
  {
    icon: Languages,
    title: "Vietnamese, where it helps",
    body: "Tap any hard word for a Vietnamese gloss, or reveal a full translation — only when you want it.",
  },
  {
    icon: Headphones,
    title: "Hear real voices",
    body: "Native-recorded audio for every sentence, with per-line playback and accents.",
  },
  {
    icon: PenLine,
    title: "Write, then get feedback",
    body: "Draft your own answer and get structured AI feedback on grammar, vocabulary and coherence.",
  },
  {
    icon: Mic,
    title: "Speak out loud",
    body: "Record your side of a real conversation and play the whole dialogue back.",
  },
  {
    icon: ShieldCheck,
    title: "Yours, and private",
    body: "Streaks, drafts, scores and recordings all live on your own device — nothing is uploaded.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-full text-[0.9375rem] text-neutral-900 dark:text-neutral-100">
      {/* Ambient particle field behind everything; carries the page base bg
          so transparent sections reveal it and opaque bands hide it. */}
      <ConfettiField />
      <AppHeader variant="landing" />

      <main>
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-50/70 to-transparent dark:from-emerald-500/5"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-2 px-4 py-16 sm:px-6 lg:grid-cols-[2.25fr_1fr] lg:py-24">
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <Image
                    src="/logo.png"
                    alt=""
                    width={16}
                    height={16}
                    className="size-4 shrink-0"
                  />
                  Learn English by immersion
                </span>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.6rem]">
                  English that feels less like studying —{" "}
                  {/* desktop: force the emerald clause onto its own second line
                      so "studying —" stays up top. Mobile/tablet wrap naturally. */}
                  <br className="hidden lg:inline" />
                  <Typewriter
                    text="more like living in it."
                    className="whitespace-nowrap text-emerald-600 dark:text-emerald-400"
                  />
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-600 dark:text-neutral-300 sm:text-xl">
                  Real stories, conversations and letters, broken into short
                  lessons you can finish in a coffee break. Read them, hear them
                  in native voices, write your own, and say them out loud — with
                  Vietnamese help exactly where you need it.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href="/reading"
                    className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
                  >
                    Start learning{" "}
                    <ArrowRight className="size-4.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/reading"
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-6 py-3 text-base font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/15 dark:text-neutral-200 dark:hover:bg-white/5"
                  >
                    Browse lessons
                  </Link>
                </div>
              </Reveal>
              <Reveal delay={320}>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {FREE_CHIPS.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20"
                    >
                      <Check
                        className="size-4"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                      {label}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* hero product preview */}
            <Reveal
              delay={200}
              className="relative mx-auto w-full max-w-sm lg:mx-0 lg:ml-auto"
            >
              <div className="rotate-1 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-neutral-900">
                <div className="flex items-center gap-2 text-[0.8rem]">
                  <LevelBadge level="A1" />
                  <span className="text-neutral-400">
                    #Childhood #Perception
                  </span>
                </div>
                <h3 className="mt-3 font-semibold leading-snug">
                  The moon followed me home
                </h3>
                <p className="mt-2 leading-[1.9] text-neutral-700 dark:text-neutral-300">
                  When I was small, I was sure the moon{" "}
                  <span className="border-b-2 border-dotted border-emerald-400">
                    followed
                  </span>{" "}
                  me all the way{" "}
                  <span className="rounded bg-emerald-100 px-1 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                    home
                  </span>
                  .
                </p>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-neutral-50 p-2.5 dark:bg-white/5">
                  <span className="grid size-9 place-items-center rounded-full bg-emerald-600 text-white">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <div className="flex h-6 flex-1 items-end gap-0.5">
                    {[3, 5, 8, 6, 4, 7, 5, 3, 6, 4, 5, 7, 4, 3].map((h, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full ${i < 3 ? "bg-emerald-500" : "bg-neutral-300 dark:bg-white/15"}`}
                        style={{ height: `${h * 0.125}rem` }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-xs text-neutral-500">
                    0:12
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-3 -left-3 -rotate-3 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-lg ring-1 ring-emerald-600/10 dark:bg-neutral-800 dark:text-emerald-300">
                ✓ 9/10 Nice reading!
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== Stats + welcome-back (real data) ===== */}
        <Reveal>
          <LandingDashboard />
        </Reveal>

        {/* ===== FOUR SKILLS ===== */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Four skills, one habit
            </h2>
            <p className="mt-1 text-neutral-500">
              Read, listen, speak and write — each as short, finishable lessons.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-7">
            <SkillCards />
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-4 text-sm text-neutral-400">
              Grammar and Vocabulary are on the way.
            </p>
          </Reveal>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="border-t border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <Reveal>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Built for understanding, not memorising
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Reveal key={f.title} delay={(i % 3) * 90}>
                    <div className="flex gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                        <Icon className="size-4.5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="font-semibold">{f.title}</h3>
                        <p className="mt-1 text-sm text-neutral-500">
                          {f.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== LEVELS ===== */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Start where you are
            </h2>
            <p className="mt-1 text-neutral-500">
              From your first words to confident, nuanced English.
            </p>
          </Reveal>
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {CEFR_LEVELS.map((level, i) => (
              <Reveal key={level} delay={i * 70}>
                <Link
                  href={`/reading?levels=${level}`}
                  className="block h-full rounded-2xl border border-neutral-200 bg-white p-4 transition-all hover:-translate-y-0.5 dark:border-white/10 dark:bg-neutral-900"
                >
                  <LevelBadge level={level} />
                  <h3 className="mt-3 font-semibold">
                    {LEVEL_DESCRIPTORS[level].name}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {LEVEL_DESCRIPTORS[level].blurb}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ===== SHARE ===== */}
        <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <Reveal className="flex flex-col items-start gap-5 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/10 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Know someone learning English? Pass it on.
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Engrove grows by word of mouth, not ad budgets. One share can
                give a friend free practice for life.
              </p>
            </div>
            <ShareRow />
          </Reveal>
        </section>

        {/* ===== CLOSING CTA ===== */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <Reveal className="overflow-hidden rounded-3xl bg-linear-to-br from-emerald-600 to-green-600 px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your first lesson is one tap away.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-emerald-50">
              No account, no paywall, nothing to set up. Pick a story and start
              reading — your progress is saved the moment you begin.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/reading"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
              >
                Start with Reading{" "}
                <ArrowRight className="size-4.5" aria-hidden="true" />
              </Link>
              <Link
                href="/writing"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700/40 px-6 py-3 text-base font-semibold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-emerald-700/60"
              >
                Explore all skills
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
