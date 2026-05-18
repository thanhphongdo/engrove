"use client";

import { useVocab } from "@/lib/db/use-vocab";
import { VocabTable } from "@/components/vocab/vocab-table";
import { VocabEmpty } from "@/components/vocab/vocab-empty";
import { VocabExportButton } from "@/components/vocab/vocab-export-button";

export default function VocabPage() {
  const entries = useVocab();

  if (entries === undefined) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <header className="mb-4 flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">My vocab</h1>
          <p className="text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? "word" : "words"} saved
          </p>
        </div>
        <VocabExportButton entries={entries} />
      </header>

      {entries.length === 0 ? <VocabEmpty /> : <VocabTable entries={entries} />}
    </div>
  );
}
