"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyAccessLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const value = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }
  return <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand bg-white px-4 py-2 text-sm font-bold text-brand-strong hover:bg-brand-soft">{copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}{copied ? "Skopiowano" : "Skopiuj link"}</button>;
}

