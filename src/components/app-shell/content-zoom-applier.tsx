"use client";

import { useEffect } from "react";
import { usePreferences } from "@/lib/db/use-preferences";

/**
 * Writes the active profile's contentZoom to documentElement as the
 * `--content-zoom` CSS variable, which is consumed by `html { font-size }` in
 * globals.css. Rendered once inside Providers — no UI of its own.
 */
export function ContentZoomApplier() {
  const { contentZoom } = usePreferences();
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--content-zoom",
      `${Math.round(contentZoom * 100)}%`,
    );
  }, [contentZoom]);
  return null;
}
