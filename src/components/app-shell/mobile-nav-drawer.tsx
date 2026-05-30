"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-config";
import { Brand } from "./brand";
import { ContentZoomControl } from "./content-zoom-control";

/**
 * Mobile navigation: a hamburger button in the top bar that opens a left
 * slide-in drawer with the full nav plus the text-size control. Closes on route
 * change, on Escape, and on backdrop tap; locks body scroll while open.
 */
export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  // Portal target is only available after mount (client). Rendering the overlay
  // into document.body keeps its `fixed` positioning relative to the viewport —
  // inside the header, the header's backdrop-filter becomes the containing block
  // and traps the drawer to the 56px bar.
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="mr-1 grid size-9 place-items-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10 md:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {mounted &&
        createPortal(
          <>
            <div
              aria-hidden={!open}
              onClick={() => setOpen(false)}
              className={cn(
                "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 md:hidden",
                open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
              )}
            />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 dark:bg-neutral-900 md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4 dark:border-white/10">
          <Brand />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="grid size-9 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10",
                    )}
                  >
                    <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.comingSoon && (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-neutral-400 dark:bg-white/10 dark:text-neutral-500">
                        Soon
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-neutral-200 p-3 dark:border-white/10">
          <ContentZoomControl />
        </div>
      </aside>
          </>,
          document.body,
        )}
    </>
  );
}
