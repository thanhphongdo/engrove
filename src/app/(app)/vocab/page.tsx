"use client";

import { useVocab } from "@/lib/db/use-vocab";
import { VocabTable } from "@/components/vocab/vocab-table";
import { VocabEmpty } from "@/components/vocab/vocab-empty";
import { VocabExportButton } from "@/components/vocab/vocab-export-button";

export default function VocabPage() {
  const entries = useVocab();

  if (entries === undefined) {
    return <div className="p-8 text-sm text-neutral-500">Loading…</div>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My vocab</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {entries.length} {entries.length === 1 ? "word" : "words"} saved
          </p>
        </div>
        <VocabExportButton entries={entries} />
      </header>

      {entries.length === 0 ? <VocabEmpty /> : <VocabTable entries={entries} />}
    </main>
  );
}
