"use client";

import { cn } from "@/lib/utils";

export type ChipOption = { value: string; label: string; className?: string };

export function FilterChipRow({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: ChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              active
                ? cn("border-primary/40", opt.className ?? "bg-primary/15 text-primary")
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
