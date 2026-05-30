import Link from "next/link";
import { Brand } from "./brand";
import { FooterWave } from "./footer-wave";

const SOCIAL_BUTTON =
  "grid size-9 place-items-center rounded-full border border-neutral-200 text-neutral-500 transition-colors dark:border-white/10 dark:text-neutral-400";

type FooterLink = { label: string; href?: string };

const LEARN: FooterLink[] = [
  { label: "Reading", href: "/reading" },
  { label: "Listening", href: "/listening" },
  { label: "Speaking", href: "/speaking" },
  { label: "Writing", href: "/writing" },
];

const LEVELS: FooterLink[] = [
  { label: "A1 · Beginner", href: "/reading?levels=A1" },
  { label: "A2 · Elementary", href: "/reading?levels=A2" },
  { label: "B1 · Intermediate", href: "/reading?levels=B1" },
  { label: "B2 · Upper-intermediate", href: "/reading?levels=B2" },
  { label: "C1 · Advanced", href: "/reading?levels=C1" },
];

const ABOUT: FooterLink[] = [
  { label: "How it works" },
  { label: "Privacy — your data stays local" },
];

/** Landing-only footer: brand + social icons, Learn / Levels / About columns.
 *
 * Layout: brand block stacked on top, link groups in their own responsive grid
 * (2 columns on phones, 3 on tablet+) so the groups never collapse into one
 * long sparse list. On desktop the brand floats left of the columns. */
export function AppFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
      {/* Ambient ASCII-dot wave sits behind the brand + link columns only —
          never behind the legal bar below. */}
      <div className="relative overflow-hidden">
        <FooterWave />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:justify-between lg:gap-16">
        {/* Brand */}
        <div className="lg:max-w-xs">
          <Brand />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
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

        {/* Link groups — own grid so they stay tidy on every width. */}
        <nav className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 sm:gap-x-12 lg:gap-x-16">
          <FooterColumn title="Learn" links={LEARN} />
          <FooterColumn title="Levels" links={LEVELS} />
          {/* About spans the full row on phones so its longer label never gets squeezed. */}
          <FooterColumn title="About" links={ABOUT} className="col-span-2 sm:col-span-1" />
        </nav>
        </div>
      </div>
      <div className="border-t border-neutral-100 px-4 py-5 text-center text-xs text-neutral-400 dark:border-white/5">
        100% free · No ads · Works offline · No account · A non-profit project for the community.
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  className,
}: {
  title: string;
  links: FooterLink[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</h4>
      <ul className="mt-3 space-y-2.5 text-sm text-neutral-600 dark:text-neutral-300">
        {links.map((l) => (
          <li key={l.label}>
            {l.href ? (
              <Link href={l.href} className="transition-colors hover:text-neutral-900 dark:hover:text-white">
                {l.label}
              </Link>
            ) : (
              <span className="text-neutral-500">{l.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
