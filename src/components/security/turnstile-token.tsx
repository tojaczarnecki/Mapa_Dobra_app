"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileWidget = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window { turnstile?: TurnstileWidget; }
}

const SCRIPT_ID = "cloudflare-turnstile-script";

function isEnabled() {
  return process.env.NEXT_PUBLIC_TURNSTILE_MODE === "required" && Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export function useTurnstileToken() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | undefined>(undefined);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);
  const [enabled] = useState(isEnabled);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const host = containerRef.current ?? document.createElement("div");
    const ownsHost = !containerRef.current;
    if (ownsHost) { host.setAttribute("aria-hidden", "true"); host.className = "pointer-events-none absolute h-px w-px overflow-hidden"; document.body.appendChild(host); }
    const setup = () => {
      if (!window.turnstile || widgetRef.current) return;
      widgetRef.current = window.turnstile.render(host, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        size: "invisible",
        callback: (token: string) => { resolveRef.current?.(token); resolveRef.current = null; rejectRef.current = null; },
        "expired-callback": () => { rejectRef.current?.(new Error("TURNSTILE_EXPIRED")); resolveRef.current = null; rejectRef.current = null; },
        "error-callback": () => { rejectRef.current?.(new Error("TURNSTILE_ERROR")); resolveRef.current = null; rejectRef.current = null; },
      });
      setReady(true);
    };
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) { existing.addEventListener("load", setup); setup(); return () => { existing.removeEventListener("load", setup); if (ownsHost) host.remove(); }; }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", setup);
    document.head.appendChild(script);
    return () => { script.removeEventListener("load", setup); if (ownsHost) host.remove(); };
  }, [enabled]);

  const requestToken = useCallback(() => {
    if (!enabled) return Promise.resolve("");
    if (!ready || !widgetRef.current || !window.turnstile) return Promise.reject(new Error("TURNSTILE_UNAVAILABLE"));
    return new Promise<string>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
      window.turnstile?.reset(widgetRef.current!);
      window.turnstile?.execute(widgetRef.current!);
    });
  }, [enabled, ready]);

  return { enabled, ready, requestToken, containerRef };
}
