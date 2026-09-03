"use client";

import { useSyncExternalStore } from "react";

type StandaloneNavigator = Navigator & { standalone?: boolean };

export function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as StandaloneNavigator).standalone);
}

function subscribe(onChange: () => void) {
  const mediaQuery = window.matchMedia("(display-mode: standalone)");
  const handleChange = () => onChange();
  mediaQuery.addEventListener("change", handleChange);
  window.addEventListener("appinstalled", handleChange);
  window.addEventListener("pageshow", handleChange);
  return () => {
    mediaQuery.removeEventListener("change", handleChange);
    window.removeEventListener("appinstalled", handleChange);
    window.removeEventListener("pageshow", handleChange);
  };
}

export function useIsStandalonePwa() {
  return useSyncExternalStore(subscribe, isStandalonePwa, () => false);
}
