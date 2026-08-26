"use client";

import { useEffect } from "react";

export function useUnsavedChangesGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const message = "Masz niezapisane zmiany. Czy na pewno chcesz opuścić formularz?";
    let allowUnload = false;
    const currentUrl = window.location.href;
    const guardState = { ...(window.history.state ?? {}), mapaDobraDraftGuard: true };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (allowUnload) return; event.preventDefault(); event.returnValue = message; };
    const click = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.href === window.location.href) return;
      if (!window.confirm(message)) event.preventDefault();
      else allowUnload = true;
    };
    const popstate = () => {
      const destination = window.location.href;
      if (destination === currentUrl) return;
      window.history.pushState(guardState, "", currentUrl);
      if (window.confirm(message)) {
        allowUnload = true;
        window.location.assign(destination);
      }
    };
    window.history.replaceState(guardState, "", currentUrl);
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
