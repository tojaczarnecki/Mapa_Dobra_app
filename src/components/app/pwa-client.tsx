"use client";

import Link from "next/link";
import { Download, Share, WifiOff } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isStandalonePwa, useIsStandalonePwa } from "@/components/app/use-is-standalone-pwa";

const DISMISSED_KEY = "mapa-dobra:pwa-install-dismissed";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const RESUME_STALE_AFTER_MS = 90_000;
const CURRENT_RELEASE = process.env.NEXT_PUBLIC_RELEASE_SHA ?? "development";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosSafari() {
  const userAgent = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isIos && /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);
}

export function PwaClient({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [meaningfulInteraction, setMeaningfulInteraction] = useState(false);
  const [iosInstructions, setIosInstructions] = useState(false);
  const standalone = useIsStandalonePwa();
  const connectionInitialized = useRef(false);
  const reconnectTimer = useRef<number | undefined>(undefined);
  const lastActiveAt = useRef(0);
  const revalidatingRef = useRef(false);
  const releaseCheckRef = useRef(false);
  const releaseReloadRef = useRef(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const dismissedUntil = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0);
    return dismissedUntil > Date.now();
  });

  useEffect(() => {
    let workerRegistration: ServiceWorkerRegistration | undefined;
    const hadServiceWorkerController = "serviceWorker" in navigator && Boolean(navigator.serviceWorker.controller);

    const checkRelease = async () => {
      if (!enabled || !navigator.onLine || document.visibilityState !== "visible" || releaseCheckRef.current || releaseReloadRef.current) return;
      if (CURRENT_RELEASE === "development") return;
      releaseCheckRef.current = true;
      try {
        const response = await fetch("/api/release", { cache: "no-store", headers: { "x-dobra-mapa-release-check": "1" } });
        if (!response.ok) return;
        const body = await response.json() as { release?: string };
        if (body.release && body.release !== CURRENT_RELEASE) {
          releaseReloadRef.current = true;
          window.location.reload();
        }
      } catch {
        // Release checks are best effort and must never block the public application.
      } finally {
        releaseCheckRef.current = false;
      }
    };

    lastActiveAt.current = Date.now();
    const revalidateIfStale = () => {
      if (document.visibilityState !== "visible" || revalidatingRef.current) return;
      const inactiveFor = Date.now() - lastActiveAt.current;
      lastActiveAt.current = Date.now();
      if (inactiveFor < RESUME_STALE_AFTER_MS) return;

      // A client-side router refresh does not replace root-layout CSS chunks. In a
      // standalone PWA that can leave the previous release's visual system alive
      // after a deployment. A full navigation guarantees the new app shell/CSS.
      if (isStandalonePwa()) {
        window.location.reload();
        return;
      }

      revalidatingRef.current = true;
      setRevalidating(true);
      router.refresh();
      window.setTimeout(() => {
        revalidatingRef.current = false;
        setRevalidating(false);
      }, 1500);
    };

    const updateServiceWorker = () => {
      if (!enabled || !navigator.onLine || document.visibilityState !== "visible" || !workerRegistration) return;
      void workerRegistration.update().catch(() => {
        // A failed update check must never block the public application.
      });
    };
    const updateConnection = () => {
      const isOffline = !navigator.onLine;
      setOffline(isOffline);
      if (!isOffline) {
        if (connectionInitialized.current) {
          setReconnected(true);
          if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
          reconnectTimer.current = window.setTimeout(() => setReconnected(false), 2600);
          revalidateIfStale();
        }
        updateServiceWorker();
        void checkRelease();
      }
      connectionInitialized.current = true;
    };
    const onNetworkFailure = () => setOffline(true);
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setShowInstall(false);
      setIosInstructions(false);
    };
    const onOpenInstall = () => {
      if (isStandalonePwa()) return;
      if (isIosSafari()) setIosInstructions(true);
      else setShowInstall(true);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") lastActiveAt.current = Date.now();
      else {
        revalidateIfStale();
        updateServiceWorker();
        void checkRelease();
      }
    };
    const onPageShow = () => {
      revalidateIfStale();
      void checkRelease();
    };
    const onFocus = () => {
      revalidateIfStale();
      void checkRelease();
    };
    const onControllerChange = () => {
      if (!hadServiceWorkerController || !isStandalonePwa() || releaseReloadRef.current) return;
      releaseReloadRef.current = true;
      window.location.reload();
    };

    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("mapa-dobra:network-failure", onNetworkFailure);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("mapa-dobra:open-install", onOpenInstall);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    if (enabled && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          workerRegistration = registration;
          updateServiceWorker();
          void checkRelease();
        })
        .catch(() => {
          // The application remains usable online when registration is unavailable.
        });
    }

    return () => {
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("mapa-dobra:network-failure", onNetworkFailure);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("mapa-dobra:open-install", onOpenInstall);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [enabled, router]);

  useEffect(() => {
    const isMeaningfulRoute = pathname.startsWith("/szukaj") || pathname.startsWith("/mapa") || pathname.startsWith("/lodz/");
    if (!isMeaningfulRoute || standalone || dismissed) return;
    const timer = window.setTimeout(() => setMeaningfulInteraction(true), 1400);
    return () => window.clearTimeout(timer);
  }, [dismissed, pathname, standalone]);

  const dismissInstall = () => {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_COOLDOWN_MS));
    setDismissed(true);
    setShowInstall(false);
    setIosInstructions(false);
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setShowInstall(false);
  };

  const showPublicInstallUi = !pathname.startsWith("/admin") && !standalone && !dismissed;
  const iosDevice = typeof window !== "undefined" && isIosSafari();
  const contextualInstallReady = meaningfulInteraction && (Boolean(installPrompt) || iosDevice);

  return (
    <>
      {offline ? (
        <div className="offline-notice" role="status" aria-live="polite">
          <WifiOff aria-hidden="true" size={18} />
          <span>Jesteś offline. Zapisane miejsca nadal są dostępne.</span>
          <Link href="/offline">Pokaż zapisane</Link>
        </div>
      ) : reconnected ? <div className="offline-notice offline-notice-reconnected" role="status" aria-live="polite">Połączenie przywrócone.</div> : revalidating ? <div className="offline-notice" role="status" aria-live="polite">Aktualizuję dane…</div> : null}
      {showPublicInstallUi && (showInstall || contextualInstallReady) ? (
        <aside className="pwa-install-notice md-pwa-install" aria-label="Instalacja Mapy Dobra">
          <div className="pwa-install-icon" aria-hidden="true"><Download size={20} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[#08255B]">Miej Dobrą Mapę zawsze pod ręką</p>
            <p className="mt-1 text-sm text-muted-foreground">Dodaj ją do swojego urządzenia i otwieraj jak zwykłą aplikację.</p>
            {iosInstructions || (contextualInstallReady && iosDevice) ? (
              <p className="mt-2 text-sm text-muted-foreground"><strong>Udostępnij → Dodaj do ekranu początkowego</strong></p>
            ) : !installPrompt ? (
              <p className="mt-2 text-sm text-muted-foreground">W menu przeglądarki wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.</p>
            ) : null}
            {iosInstructions ? (
              <Share aria-hidden="true" className="mt-2 text-[#08255B]" size={19} />
            ) : installPrompt ? (
              <button type="button" className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#08255B] px-4 text-sm font-bold text-white hover:bg-[#061A42]" onClick={() => void install()}>
                Dodaj do urządzenia
              </button>
            ) : null}
          </div>
          <button type="button" className="touch-target inline-flex shrink-0 items-center justify-center rounded-md px-2 text-sm font-bold text-muted-foreground hover:bg-surface-muted hover:text-foreground" onClick={dismissInstall}>Nie teraz</button>
        </aside>
      ) : null}
    </>
  );
}
