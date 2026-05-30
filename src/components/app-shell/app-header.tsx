import Link from "next/link";
import { Brand } from "./brand";
import { TopNav } from "./top-nav";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { ThemeToggle } from "./theme-toggle";
import { TextSizePopover } from "./text-size-popover";
import { StreakChip } from "./streak-chip";

/**
 * Sticky top app bar shared across the whole product.
 *
 * - `app` (default): streak pill + theme toggle + "Aa" text-size control.
 * - `landing`: theme toggle + a "Start learning" CTA (no streak / no Aa).
 *
 * The desktop nav, mobile hamburger drawer, and brand are identical in both.
 */
export function AppHeader({ variant = "app" }: { variant?: "app" | "landing" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-neutral-900/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <MobileNavDrawer />
        <Brand />
        <TopNav />

        <div className="ml-auto flex items-center gap-1.5">
          {variant === "app" ? (
            <>
              <StreakChip />
              <ThemeToggle />
              <TextSizePopover />
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link
                href="/reading"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
              >
                Start learning
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
