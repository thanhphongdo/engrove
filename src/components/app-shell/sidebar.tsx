"use client";

import { NAV_ITEMS } from "./nav-config";
import { SidebarItem } from "./sidebar-item";
import { ThemeToggle } from "./theme-toggle";
import { ContentZoomControl } from "./content-zoom-control";

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center px-4 py-4">
        <span className="text-sm font-semibold tracking-tight">English Learning</span>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <SidebarItem item={item} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="shrink-0 space-y-2 border-t px-3 py-3">
        <ThemeToggle />
        <ContentZoomControl />
      </div>
    </aside>
  );
}
