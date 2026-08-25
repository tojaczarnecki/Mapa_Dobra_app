"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

export function ArticleShare({ title, text }: { title: string; text: string }) {
  const [status, setStatus] = useState("");

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link skopiowany");
      window.setTimeout(() => setStatus(""), 2400);
    } catch {
      setStatus("Skopiuj adres strony z przeglądarki");
    }
  };

  return (
    <span className="knowledge-share-wrap">
      <button type="button" className="knowledge-share" onClick={() => void share()} aria-label="Udostępnij artykuł">
        <Share2 aria-hidden="true" size={18} />
        <span>Udostępnij</span>
      </button>
      <span className="knowledge-share-status" aria-live="polite">{status}</span>
    </span>
  );
}
