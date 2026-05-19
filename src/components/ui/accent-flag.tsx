import type { Accent } from "@/lib/lessons/types";

const FLAG: Record<Accent, { emoji: string; label: string }> = {
  "en-US": { emoji: "🇺🇸", label: "US English" },
  "en-GB": { emoji: "🇬🇧", label: "British English" },
  "en-AU": { emoji: "🇦🇺", label: "Australian English" },
};

export function AccentFlag({ accents }: { accents: Accent[] }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {accents.map((a) => (
        <span key={a} role="img" aria-label={FLAG[a].label}>
          {FLAG[a].emoji}
        </span>
      ))}
    </span>
  );
}
