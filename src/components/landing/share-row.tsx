"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";

const BTN =
  "grid size-10 shrink-0 place-items-center rounded-full border border-neutral-200 text-neutral-600 transition-colors dark:border-white/10 dark:text-neutral-300";

function currentUrl() {
  return typeof window !== "undefined" ? window.location.href : "https://engrove.app";
}

function openShare(buildUrl: (encoded: string) => string) {
  const url = encodeURIComponent(currentUrl());
  window.open(buildUrl(url), "_blank", "noopener,noreferrer,width=600,height=500");
}

/** Icon-only share buttons (Facebook / Zalo / X / LinkedIn) + copy-link. */
export function ShareRow() {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        className={`${BTN} hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10 hover:text-[#1877F2]`}
        aria-label="Share on Facebook"
        title="Share on Facebook"
        onClick={() => openShare((u) => `https://www.facebook.com/sharer/sharer.php?u=${u}`)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
        </svg>
      </button>
      <button
        className={`${BTN} hover:border-[#0068FF]/40 hover:bg-[#0068FF]/10 hover:text-[#0068FF]`}
        aria-label="Share on Zalo"
        title="Share on Zalo"
        onClick={() => openShare((u) => `https://zalo.me/share/link?u=${u}`)}
      >
        <span className="text-lg font-black leading-none">Z</span>
      </button>
      <button
        className={`${BTN} hover:border-neutral-900/30 hover:bg-neutral-900/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white`}
        aria-label="Share on X"
        title="Share on X"
        onClick={() => openShare((u) => `https://twitter.com/intent/tweet?url=${u}`)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>
      <button
        className={`${BTN} hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]`}
        aria-label="Share on LinkedIn"
        title="Share on LinkedIn"
        onClick={() => openShare((u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 5.9V21h-4v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21H9z" />
        </svg>
      </button>
      <button
        className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
        aria-label="Copy link"
        title="Copy link"
        onClick={copyLink}
      >
        <Link2 className="size-4.5" aria-hidden="true" />
      </button>
    </div>
  );
}
