"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

type SharePlaceButtonProps = {
  title: string;
  className?: string;
};

export function SharePlaceButton({
  title,
  className = "",
}: SharePlaceButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: title,
          url,
        });
        return;
      } catch {
        return;
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  }

  return (
    <button
      type="button"
      className={[
        "touch-target inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-transparent px-2 py-2 text-sm font-bold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground",
        className,
      ].join(" ")}
      onClick={handleShare}
    >
      {copied ? (
        <Check aria-hidden="true" size={17} />
      ) : (
        <Share2 aria-hidden="true" size={17} />
      )}
      {copied ? "Skopiowano link" : "Udostępnij miejsce"}
    </button>
  );
}
