"use client";

import { Lightbulb } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePreferences, setHintToggle } from "@/lib/db/use-preferences";
import type { HintToggles } from "@/lib/db/types";

const TOGGLES: Array<{ key: keyof HintToggles; label: string }> = [
  { key: "vocabVi",            label: "Vietnamese for hard words" },
  { key: "grammar",            label: "Grammar / tense notes" },
  { key: "passageTranslation", label: "Full passage translation" },
  { key: "perQuestionHint",    label: "Per-question hint button" },
];

export function HintSettingsPopover() {
  const prefs = usePreferences();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Lightbulb className="mr-1 size-3.5" /> Hints
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3 p-4 text-sm">
        <div>
          <p className="font-semibold">Hint settings</p>
          <p className="text-xs text-muted-foreground">Choose what to show. Off by default.</p>
        </div>
        <div className="space-y-2">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-center gap-2">
              <Checkbox
                id={`toggle-${t.key}`}
                checked={prefs.hintToggles[t.key]}
                onCheckedChange={async (checked) => {
                  await setHintToggle(t.key, checked === true);
                  toast.success("Saved");
                }}
              />
              <Label htmlFor={`toggle-${t.key}`} className="cursor-pointer text-sm font-normal">
                {t.label}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
