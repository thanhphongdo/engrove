import { Sidebar } from "@/components/app-shell/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}
