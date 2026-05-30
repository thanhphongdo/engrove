export function ComingSoon({ skill }: { skill: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-emerald-50 text-2xl dark:bg-emerald-500/15">
          🌱
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight">{skill}</h1>
        <p className="mt-1 text-sm text-neutral-500">Coming soon — we&apos;re growing this one.</p>
      </div>
    </main>
  );
}
