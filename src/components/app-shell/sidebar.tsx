import { NAV_ITEMS } from "./nav-config";
import { SidebarItem } from "./sidebar-item";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center px-4 py-4">
        <span className="text-sm font-semibold tracking-tight">English Learning</span>
      </div>
      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <SidebarItem item={item} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t px-3 py-3">
        <ThemeToggle />
      </div>
    </aside>
  );
}
