"use client";

import Link from "next/link";
import { Download, Share, WifiOff, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "mapa-dobra:pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosSafari() {
  const userAgent = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isIos && /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);
}

export function PwaClient({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const [offline, setOffline] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [iosInstructions, setIosInstructions] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(DISMISSED_KEY) === "1");

  useEffect(() => {
    let workerRegistration: ServiceWorkerRegistration | undefined;

    const updateServiceWorker = () => {
      if (!enabled || !navigator.onLine || document.visibilityState !== "visible" || !workerRegistration) return;
      void workerRegistration.update().catch(() => {
        // A failed update check must never block the public application.
      });
    };
    const updateConnection = () => {
      const isOffline = !navigator.onLine;
      setOffline(isOffline);
      if (!isOffline) updateServiceWorker();
    };
    const updateStandalone = () => setStandalone(isStandalone());
    const wasDismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      if (!wasDismissed && !isStandalone()) setShowInstall(true);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setShowInstall(false);
      setIosInstructions(false);
      setStandalone(true);
    };
    const onOpenInstall = () => {
      if (isStandalone()) return;
      if (isIosSafari()) setIosInstructions(true);
      else setShowInstall(true);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") updateServiceWorker();
    };

    updateConnection();
    updateStandalone();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("mapa-dobra:open-install", onOpenInstall);
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (enabled && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          workerRegistration = registration;
          updateServiceWorker();
        })
        .catch(() => {
          // The application remains usable online when registration is unavailable.
        });
    }

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("mapa-dobra:open-install", onOpenInstall);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);

  const dismissInstall = () => {
    window.localStorage.setItem(DISMISSED_KEY, "1");
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

  return (
    <>
      {offline ? (
        <div className="offline-notice" role="status" aria-live="polite">
          <WifiOff aria-hidden="true" size={18} />
          <span>Jesteś offline. Zapisane miejsca nadal są dostępne.</span>
          <Link href="/offline">Pokaż zapisane</Link>
        </div>
      ) : null}
      {showPublicInstallUi && showInstall ? (
        <aside className="pwa-install-notice md-pwa-install" aria-label="Instalacja Mapy Dobra">
          <div className="pwa-install-icon" aria-hidden="true"><Download size={20} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[#08255B]">Zapisz Mapę Dobra na telefonie</p>
            <p className="mt-1 text-sm text-muted-foreground">Szybszy dostęp do pomocy bez szukania strony w przeglądarce.</p>
            {iosInstructions ? (
              <p className="mt-2 text-sm text-muted-foreground">Wybierz <strong>Udostępnij</strong>, a następnie <strong>Dodaj do ekranu początkowego</strong>.</p>
            ) : !installPrompt ? (
              <p className="mt-2 text-sm text-muted-foreground">W menu przeglądarki wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.</p>
            ) : null}
            {iosInstructions ? (
              <Share aria-hidden="true" className="mt-2 text-[#08255B]" size={19} />
            ) : installPrompt ? (
              <button type="button" className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#08255B] px-4 text-sm font-bold text-white hover:bg-[#061A42]" onClick={() => void install()}>
                Zapisz aplikację
              </button>
            ) : null}
          </div>
          <button type="button" className="touch-target inline-flex shrink-0 items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground" onClick={dismissInstall} aria-label="Zamknij komunikat instalacji" title="Zamknij"><X aria-hidden="true" size={19} /></button>
        </aside>
      ) : null}
    </>
  );
}
