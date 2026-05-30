import Link from "next/link";
import { Brand } from "./brand";

const SOCIAL_BUTTON =
  "grid size-9 place-items-center rounded-full border border-neutral-200 text-neutral-500 transition-colors dark:border-white/10 dark:text-neutral-400";

const LEARN = [
  { label: "Reading", href: "/reading" },
  { label: "Listening", href: "/listening" },
  { label: "Speaking", href: "/speaking" },
  { label: "Writing", href: "/writing" },
];

const LEVELS = [
  { label: "A1 · Beginner", href: "/reading?levels=A1" },
  { label: "A2 · Elementary", href: "/reading?levels=A2" },
  { label: "B1 · Intermediate", href: "/reading?levels=B1" },
  { label: "B2 · Upper-intermediate", href: "/reading?levels=B2" },
  { label: "C1 · Advanced", href: "/reading?levels=C1" },
];

/** Landing-only footer: brand + social icons, Learn / Levels / About columns. */
export function AppFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Brand />
          <p className="mt-3 max-w-xs text-sm text-neutral-500">
            Learn English by living in it — real stories, native voices, and gentle Vietnamese support.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button className={`${SOCIAL_BUTTON} hover:text-[#1877F2]`} aria-label="Facebook" title="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
              </svg>
            </button>
            <button className={`${SOCIAL_BUTTON} hover:text-[#0068FF]`} aria-label="Zalo" title="Zalo">
              <span className="text-[0.7rem] font-black leading-none">Z</span>
            </button>
            <button className={`${SOCIAL_BUTTON} hover:text-neutral-900 dark:hover:text-white`} aria-label="X" title="X">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
            <button className={`${SOCIAL_BUTTON} hover:text-[#0A66C2]`} aria-label="LinkedIn" title="LinkedIn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 5.9V21h-4v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21H9z" />
              </svg>
            </button>
          </div>
        </div>

        <FooterColumn title="Learn" links={LEARN} />
        <FooterColumn title="Levels" links={LEVELS} />

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">About</h4>
          <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <li><span className="text-neutral-500">How it works</span></li>
            <li><span className="text-neutral-500">Privacy — your data stays local</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-100 py-5 text-center text-xs text-neutral-400 dark:border-white/5">
        100% free · No ads · Works offline · No account · A non-profit project for the community.
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="transition-colors hover:text-neutral-900 dark:hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
