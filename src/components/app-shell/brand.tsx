import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Engrove wordmark — the sprout logo already reads as an "E", so the text is
 * just "ngrove" tucked tight against it and bottom-aligned, reading "Engrove".
 * Used in the top app bar and the landing footer. Links home by default.
 */
export function Brand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-end gap-0", className)} aria-label="Engrove home">
      <Image src="/logo.png" alt="" width={32} height={32} className="size-8 shrink-0" priority />
      {/* Icon already reads as the "E"; "ngrove" tucks against it (+3px), and
          "rove" is set a touch larger in the Fraunces wordmark face for flair. */}
      <span className="wordmark -ml-px text-xl leading-[1.15]">
        ng<span className="font-wordmark text-[1.4rem]">rove</span>
      </span>
    </Link>
  );
}
