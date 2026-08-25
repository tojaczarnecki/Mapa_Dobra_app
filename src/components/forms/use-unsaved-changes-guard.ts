"use client";

import { useEffect } from "react";

export function useUnsavedChangesGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const message = "Masz niezapisane zmiany. Czy na pewno chcesz opuścić formularz?";
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = message; };
    const click = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.href === window.location.href) return;
      if (!window.confirm(message)) event.preventDefault();
    };
    const popstate = () => {
      if (window.confirm(message)) return;
      window.history.forward();
    };
    window.history.replaceState({ ...(window.history.state ?? {}), mapaDobraDraftGuard: true }, "", window.location.href);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", popstate);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", popstate);
    };
  }, [enabled]);
}
