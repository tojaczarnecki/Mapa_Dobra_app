"use client";

import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

const SEEN_KEY = "mapa-dobra:notification-preprompt-seen";

export function NotificationPrePrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onSavedPlace = () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission !== "default") return;
      try {
        if (window.localStorage.getItem(SEEN_KEY) === "1") return;
        window.localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // The prompt remains session-only if storage is unavailable.
      }
      setVisible(true);
    };
    window.addEventListener("mapa-dobra:saved-place", onSavedPlace);
    return () => window.removeEventListener("mapa-dobra:saved-place", onSavedPlace);
  }, []);

  if (!visible) return null;
  return <aside className="notification-preprompt" role="dialog" aria-labelledby="notification-preprompt-title">
    <div className="notification-preprompt-icon" aria-hidden="true"><Bell size={20} /></div>
    <div><h2 id="notification-preprompt-title">Chcesz wiedzieć, jeśli zmienią się ważne informacje o tym miejscu?</h2><p>Możesz włączyć powiadomienia w ustawieniach. To Ty wybierasz zakres informacji.</p><div className="notification-preprompt-actions"><Link href="/ustawienia/powiadomienia" onClick={() => setVisible(false)}>Włącz powiadomienia</Link><button type="button" onClick={() => setVisible(false)}>Później</button></div></div>
    <button type="button" className="notification-preprompt-close" aria-label="Zamknij" onClick={() => setVisible(false)}><X aria-hidden="true" size={18} /></button>
  </aside>;
}
