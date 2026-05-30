"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "./nav-config";

function useIsActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNavLink({ item }: { item: NavItem }) {
  const active = useIsActive(item.href);

  if (item.comingSoon) {
    return (
      <Link
        href={item.href}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-neutral-400 dark:text-neutral-500"
        title="Coming soon"
      >
        {item.label}
        <span className="size-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-3.5 py-1.5 transition-colors",
        active
          ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10",
      )}
    >
      {item.label}
    </Link>
  );
}

/** Desktop primary navigation — hidden below md (mobile uses the drawer). */
export function TopNav() {
  return (
    <nav className="ml-6 hidden items-center gap-1 text-sm font-medium md:flex">
      {NAV_ITEMS.map((item) => (
        <TopNavLink key={item.href} item={item} />
      ))}
    </nav>
  );
}
