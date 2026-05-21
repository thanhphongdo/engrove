"use client";

import { NAV_ITEMS } from "./nav-config";
import { SidebarItem } from "./sidebar-item";
import { ThemeToggle } from "./theme-toggle";
import { ContentZoomControl } from "./content-zoom-control";
import { StreakBadge } from "./streak-badge";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 px-4 py-4">
        <img src="/logo.png" alt="Engrove Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
        <span className="text-2xl bg-clip-text text-transparent bg-gradient-to-br from-emerald-700 to-green-600 dark:from-emerald-400 dark:to-green-300">
          <span className="font-display font-bold tracking-tight">En</span>
          <span className="font-wordmark italic font-medium tracking-wide" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1" }}>grove</span>
        </span>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} onClick={onNavigate}>
              <SidebarItem item={item} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="shrink-0 space-y-2 border-t px-3 py-3">
        <StreakBadge />
        <ThemeToggle />
        <ContentZoomControl />
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <SidebarContent />
    </aside>
  );
}
