"use client";

import { Columns2, Rows2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePreferences, useSetDetailLayout } from "@/lib/db/use-preferences";

export function LayoutToggle() {
  const prefs = usePreferences();
  const setDetailLayout = useSetDetailLayout();
  return (
    <ToggleGroup
      type="single"
      value={prefs.detailLayout}
      onValueChange={(v) => v && setDetailLayout(v as "two-column" | "stacked")}
      aria-label="Layout"
      size="sm"
    >
      <ToggleGroupItem value="two-column" aria-label="Two columns">
        <Columns2 className="size-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem value="stacked" aria-label="Stacked">
        <Rows2 className="size-3.5" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
