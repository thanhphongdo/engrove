"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "light",  icon: Sun,     label: "Light"  },
  { value: "dark",   icon: Moon,    label: "Dark"   },
  { value: "system", icon: Monitor, label: "System" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  // next-themes sets resolvedTheme only after hydration; use it as the mounted guard.
  if (!resolvedTheme) return <div className="h-9" aria-hidden="true" />;

  return (
    <div className="flex gap-1 rounded-md border bg-background p-1" role="radiogroup" aria-label="Theme">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = theme === m.value;
        return (
          <Button
            key={m.value}
            type="button"
            variant="ghost"
            size="sm"
            role="radio"
            aria-checked={active}
            aria-label={m.label}
            onClick={() => setTheme(m.value)}
            className={cn("h-7 flex-1 px-2", active && "bg-secondary text-secondary-foreground")}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}
