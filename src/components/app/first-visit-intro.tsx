"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const INTRO_KEY = "mapa-dobra:introSeen";
const INTRO_DURATION = 1400;
const INTRO_EXIT_DURATION = 220;

let introSeenThisSession = false;

function hasSeenIntro() {
  if (introSeenThisSession) return true;

  try {
    return window.localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroSeen() {
  introSeenThisSession = true;

  try {
    window.localStorage.setItem(INTRO_KEY, "1");
  } catch {
    // Session-only fallback when browser storage is unavailable.
  }
}

export function FirstVisitIntro() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (pathname !== "/" || hasSeenIntro()) return;

    markIntroSeen();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 350 : INTRO_DURATION;
    const showTimer = window.setTimeout(() => {
      setExiting(false);
      setVisible(true);
    }, 0);
    const exitTimer = window.setTimeout(
      () => setExiting(!reducedMotion),
      Math.max(0, duration - INTRO_EXIT_DURATION),
    );
    const hideTimer = window.setTimeout(() => setVisible(false), duration);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, [pathname]);

  if (!visible || pathname !== "/") return null;

  return (
    <div className={`first-visit-intro${exiting ? " is-exiting" : ""}`} aria-hidden="true">
      <div className="first-visit-intro-content">
        <Image src="/brand/mapa-dobra-logo.svg" alt="Mapa Dobra" width={230} height={54} priority />
        <p>Wszędzie tam, gdzie dzieje się dobro!</p>
      </div>
    </div>
  );
}
