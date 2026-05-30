import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Engrove wordmark — a leaf tile plus the emerald→green gradient "Engrove" text.
 * Used in the top app bar and the landing footer. Links home by default.
 */
export function Brand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)} aria-label="Engrove home">
      <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-lg dark:bg-emerald-500/15">
        🌱
      </span>
      <span className="wordmark text-xl">Engrove</span>
    </Link>
  );
}
