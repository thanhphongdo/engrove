import { Sidebar } from "@/components/app-shell/sidebar";
import { MobileSidebar } from "@/components/app-shell/mobile-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // h-full + min-h-0 lets the main column scroll internally instead of pushing
  // the page (and the sidebar's bottom controls) past the viewport.
  return (
    <div className="flex h-full min-h-0 flex-1">
      <Sidebar />
      <MobileSidebar />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}
