"use client";

import { useCallback, useEffect, useState } from "react";

export function useLocalStorageBoolean(
  key: string,
  defaultValue = false,
): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState<boolean>(defaultValue);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === "1" || raw === "true") setValue(true);
      else if (raw === "0" || raw === "false") setValue(false);
    } catch {
      // ignore — private mode etc.
    }
  }, [key]);

  const set = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // ignore
      }
    },
    [key],
  );

  return [value, set];
}
