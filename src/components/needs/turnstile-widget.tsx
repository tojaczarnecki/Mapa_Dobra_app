"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

type TurnstileWidgetProps = { onToken: (token: string) => void; onReset: () => void; resetSignal: number };

export function TurnstileWidget({ onToken, onReset, resetSignal }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let script: HTMLScriptElement | null = document.querySelector('script[data-turnstile="true"]');
    const render = () => {
      if (!containerRef.current || !window.turnstile || widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, { sitekey: siteKey, callback: onToken, "expired-callback": onReset, "error-callback": onReset });
    };
    if (window.turnstile) render();
    else {
      script ??= Object.assign(document.createElement("script"), { src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", async: true, defer: true, dataset: { turnstile: "true" } });
      script.addEventListener("load", render);
      if (!script.isConnected) document.head.appendChild(script);
    }
    return () => script?.removeEventListener("load", render);
  }, [onReset, onToken, siteKey]);

  useEffect(() => {
    if (resetSignal > 0) {
      onReset();
      if (widgetIdRef.current !== null) window.turnstile?.reset(widgetIdRef.current);
    }
  }, [onReset, resetSignal]);

  if (!siteKey) return <p className="text-sm text-muted-foreground">Formularz jest chwilowo niedostępny. Spróbuj ponownie później.</p>;
  return <div ref={containerRef} aria-label="Weryfikacja formularza" />;
}
