import { Sparkles } from "lucide-react";

export function VocabEmpty() {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-md border border-dashed p-8 text-center">
      <Sparkles className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-sm font-semibold">No vocab yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Click <span className="font-medium">+ Save to vocab</span> on any underlined word in a
        lesson to start building your list. (Turn on{" "}
        <span className="font-medium">&quot;Vietnamese for hard words&quot;</span> in the lesson&apos;s hint settings
        if you don&apos;t see underlined words.)
      </p>
    </div>
  );
}
