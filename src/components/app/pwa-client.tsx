"use client";

import { Download, Share, WifiOff, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DISMISSED_KEY = "mapa-dobra:pwa-install-dismissed";
const RESUME_STALE_AFTER_MS = 90_000;

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
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [iosInstructions, setIosInstructions] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const connectionInitialized = useRef(false);
  const reconnectTimer = useRef<number | undefined>(undefined);
  const lastActiveAt = useRef(0);
  const revalidating = useRef(false);
  const [dismissed, setDismissed] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(DISMISSED_KEY) === "1");

  useEffect(() => {
    lastActiveAt.current = Date.now();
    const revalidateIfStale = () => {
      if (document.visibilityState !== "visible" || revalidating.current) return;
      const inactiveFor = Date.now() - lastActiveAt.current;
      lastActiveAt.current = Date.now();
      if (inactiveFor < RESUME_STALE_AFTER_MS) return;
      revalidating.current = true;
      router.refresh();
      window.setTimeout(() => { revalidating.current = false; }, 1500);
    };
    const updateConnection = () => {
      const online = navigator.onLine;
      setOffline(!online);
      if (online && connectionInitialized.current) {
        setReconnected(true);
        if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = window.setTimeout(() => setReconnected(false), 2600);
        revalidateIfStale();
      }
      connectionInitialized.current = true;
    };
    const onNetworkFailure = () => setOffline(true);
    const updateStandalone = () => setStandalone(isStandalone());
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lastActiveAt.current = Date.now();
      } else {
        revalidateIfStale();
      }
    };
    const onPageShow = () => revalidateIfStale();
    const onFocus = () => revalidateIfStale();
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

    updateConnection();
    updateStandalone();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("mapa-dobra:network-failure", onNetworkFailure);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("mapa-dobra:open-install", onOpenInstall);

    if (enabled && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // The application remains usable online when registration is unavailable.
      });
    }

    return () => {
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("mapa-dobra:network-failure", onNetworkFailure);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("mapa-dobra:open-install", onOpenInstall);
    };
  }, [enabled, router]);

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
      {offline ? <div className="offline-notice" role="status" aria-live="polite"><WifiOff aria-hidden="true" size={18} /><span>Brak połączenia. Pokazujemy zapisane dane.</span></div> : reconnected ? <div className="offline-notice offline-notice-reconnected" role="status" aria-live="polite"><span>Połączenie przywrócone.</span></div> : null}
      {showPublicInstallUi && showInstall ? <aside className="pwa-install-notice" aria-label="Instalacja Mapy Dobra">
        <div className="pwa-install-icon" aria-hidden="true"><Download size={20} /></div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#18364D]">Zainstaluj Mapę Dobra — bezpłatnie</p>
          <p className="mt-1 text-sm text-muted-foreground">Miej pomoc zawsze pod ręką. Bez opłat, bez App Store i Google Play.</p>
          <ul className="mt-2 grid gap-0.5 text-xs text-muted-foreground" aria-label="Korzyści instalacji">
            <li>Bezpłatna</li>
            <li>Szybki dostęp z ekranu głównego</li>
            <li>Działa jak aplikacja</li>
            <li>Bez pobierania ze sklepu</li>
          </ul>
          {iosInstructions ? <p className="mt-2 text-sm text-muted-foreground">Wybierz <strong>Udostępnij</strong>, a następnie <strong>Dodaj do ekranu początkowego</strong>.</p> : !installPrompt ? <p className="mt-2 text-sm text-muted-foreground">W menu przeglądarki wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.</p> : null}
          {iosInstructions ? <Share aria-hidden="true" className="mt-2 text-[#0F766E]" size={19} /> : installPrompt ? <button type="button" className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0F766E] px-4 text-sm font-bold text-white hover:bg-[#0B625C]" onClick={() => void install()}>Zainstaluj bezpłatnie</button> : null}
        </div>
        <button type="button" className="touch-target inline-flex shrink-0 items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground" onClick={dismissInstall} aria-label="Zamknij komunikat instalacji" title="Zamknij"><X aria-hidden="true" size={19} /></button>
      </aside> : null}
    </>
  );
}
