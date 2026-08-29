export const FIRST_LAUNCH_COMPLETE_KEY = "mapa-dobra:first-launch-complete";

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function fillHeightForProgress(progress: number): string {
  return `${clampProgress(progress)}%`;
}

export function stagedProgress(elapsedMs: number, minimumExposureMs: number): number {
  if (!Number.isFinite(elapsedMs) || minimumExposureMs <= 0) return 8;
  return clampProgress(Math.min(89, (elapsedMs / minimumExposureMs) * 76 + 8));
}

export function canFinishSplash(ready: boolean, elapsedMs: number, minimumExposureMs: number): boolean {
  return ready && elapsedMs >= minimumExposureMs;
}

export function shouldShowLaunchSplash({
  completed,
  isMobile,
  force,
}: {
  completed: boolean;
  isMobile: boolean;
  force: boolean;
}): boolean {
  return force || (isMobile && !completed);
}

export function readFirstLaunchComplete(storage: Pick<Storage, "getItem"> | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(FIRST_LAUNCH_COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFirstLaunchComplete(storage: Pick<Storage, "setItem"> | null): void {
  if (!storage) return;
  try {
    storage.setItem(FIRST_LAUNCH_COMPLETE_KEY, "1");
  } catch {
    // Private browsing and blocked storage must not prevent the app from starting.
  }
}

export function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
