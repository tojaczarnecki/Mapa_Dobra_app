"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function PwaClient({ enabled }: { enabled: boolean }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const updateConnection = () => setOffline(!navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    if (enabled && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // The application remains usable online when registration is unavailable.
      });
    }

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, [enabled]);

  if (!offline) return null;

  return (
    <div className="offline-notice" role="status" aria-live="polite">
      <WifiOff aria-hidden="true" size={18} />
      <span>Brak połączenia z internetem. Niektóre informacje mogą być niedostępne lub nieaktualne.</span>
    </div>
  );
}
