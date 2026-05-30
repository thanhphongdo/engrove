import { AppHeader } from "@/components/app-shell/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-neutral-50 text-[0.9375rem] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <AppHeader />
      {children}
    </div>
  );
}
