"use client";

import { useEffect } from "react";
import { ensureDefaultProfile } from "./queries";

export function useDbInit() {
  useEffect(() => {
    ensureDefaultProfile().catch((err) => {
      console.error("Failed to initialize local database", err);
    });
  }, []);
}
