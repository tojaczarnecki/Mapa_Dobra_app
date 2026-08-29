"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  clampProgress,
  canFinishSplash,
  fillHeightForProgress,
  getBrowserStorage,
  markFirstLaunchComplete,
  readFirstLaunchComplete,
  shouldShowLaunchSplash,
  stagedProgress,
} from "@/lib/app/launch-splash";

const MIN_EXPOSURE_MS = 1500;
const FAIL_SAFE_MS = 4500;
const EXIT_MS = 320;

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 767px)").matches || isStandalone();
}

function isDebugForced(): boolean {
  return process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("intro") === "1";
}

export function LaunchSplash() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const forced = isDebugForced();
    const storage = getBrowserStorage();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimumExposure = reducedMotion ? 120 : MIN_EXPOSURE_MS;
    const show = shouldShowLaunchSplash({
      completed: readFirstLaunchComplete(storage),
      isMobile: isMobileViewport(),
      force: forced,
    });

    if (!show) {
      const hideTimer = window.setTimeout(() => setVisible(false), 0);
      return () => window.clearTimeout(hideTimer);
    }

    let cancelled = false;
    let ready = document.readyState === "complete";
    let loadTimer: number | undefined;
    let exitTimer: number | undefined;
    const startedAt = performance.now();

    const finishWhenReady = () => {
      ready = true;
    };

    if (!ready) {
      window.addEventListener("load", finishWhenReady, { once: true });
      loadTimer = window.setTimeout(finishWhenReady, FAIL_SAFE_MS);
    }

    const finish = () => {
      if (cancelled) return;
      markFirstLaunchComplete(storage);
      setProgress(100);
      setExiting(true);
      exitTimer = window.setTimeout(() => {
        if (!cancelled) setVisible(false);
      }, EXIT_MS);
    };

    const progressTimer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const exposureProgress = stagedProgress(elapsed, minimumExposure);
      if (canFinishSplash(ready, elapsed, minimumExposure)) {
        window.clearInterval(progressTimer);
        finish();
        return;
      }
      setProgress((current) => Math.max(current, clampProgress(exposureProgress)));
    }, 50);

    const failSafeTimer = window.setTimeout(() => {
      ready = true;
    }, FAIL_SAFE_MS);

    void document.fonts?.ready.then(() => {
      ready = document.readyState === "complete" || ready;
    });

    return () => {
      cancelled = true;
      if (loadTimer) window.clearTimeout(loadTimer);
      if (progressTimer) window.clearInterval(progressTimer);
      if (failSafeTimer) window.clearTimeout(failSafeTimer);
      if (exitTimer) window.clearTimeout(exitTimer);
      window.removeEventListener("load", finishWhenReady);
    };
  }, []);

  if (!visible) return null;

  const fillHeight = fillHeightForProgress(progress);

  return (
    <div className={`launch-splash${exiting ? " launch-splash-exiting" : ""}`} role="status" aria-label="Ładowanie Mapy Dobra">
      <div className="launch-splash-content">
        <div className="launch-splash-logo" aria-hidden="true">
          <Image className="launch-splash-logo-outline" src="/brand/mapa-dobra-wordmark.svg" alt="" width={170} height={41} priority />
          <div className="launch-splash-logo-fill" style={{ "--launch-fill-height": fillHeight } as React.CSSProperties}>
            <span className="launch-splash-liquid" />
          </div>
        </div>
        <p className="launch-splash-claim">Wszędzie tam, gdzie dzieje się dobro</p>
        <span className="launch-splash-progress" aria-hidden="true">{Math.round(clampProgress(progress))}%</span>
      </div>
    </div>
  );
}
