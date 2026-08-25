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
  const [shareError, setShareError] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    setShareError(false);

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
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      } catch {
        setShareError(true);
      }
    }
  }

  return (
    <button
      type="button"
      className={[
        "touch-target",
        className,
      ].join(" ")}
      aria-label="Udostępnij miejsce"
      onClick={handleShare}
    >
      {copied ? (
        <Check aria-hidden="true" size={17} />
      ) : (
        <Share2 aria-hidden="true" size={17} />
      )}
      {copied ? "Skopiowano link" : shareError ? "Nie udało się skopiować" : "Udostępnij"}
    </button>
  );
}
