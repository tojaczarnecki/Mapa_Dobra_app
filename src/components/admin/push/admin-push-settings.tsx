"use client";

import { Bell, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type PushState = "loading" | "unavailable" | "disabled" | "enabled" | "denied" | "error";

function decodeVapidKey(key: string) {
  const padding = "=".repeat((4 - key.length % 4) % 4);
  const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function AdminPushSettings() {
  const [state, setState] = useState<PushState>("loading");
  const [publicKey, setPublicKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState("unavailable");
        return;
      }
      try {
        const response = await fetch("/admin/api/push/config", { cache: "no-store" });
        const config = await response.json() as { available?: boolean; publicKey?: string };
        if (cancelled) return;
        if (!response.ok || !config.available || !config.publicKey) { setState("unavailable"); return; }
        setPublicKey(config.publicKey);
        if (Notification.permission === "denied") { setState("denied"); return; }
        const registration = await navigator.serviceWorker.ready;
        setState(await registration.pushManager.getSubscription() ? "enabled" : "disabled");
      } catch { if (!cancelled) setState("error"); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const enable = async () => {
    setBusy(true); setMessage("");
    try {
      if (Notification.permission === "denied") { setState("denied"); return; }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "denied" : "disabled"); return; }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(publicKey) });
      const json = subscription.toJSON();
      const response = await fetch("/admin/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, expirationTime: json.expirationTime, userAgent: navigator.userAgent }) });
      if (!response.ok) throw new Error("subscribe-failed");
      setState("enabled"); setMessage("Powiadomienia są włączone na tym urządzeniu.");
    } catch { setState("error"); setMessage("Nie udało się włączyć powiadomień."); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/admin/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      setState("disabled"); setMessage("Powiadomienia są wyłączone na tym urządzeniu.");
    } catch { setState("error"); setMessage("Nie udało się wyłączyć powiadomień."); }
    finally { setBusy(false); }
  };

  const sendTest = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/admin/api/push/test", { method: "POST" });
      if (!response.ok) throw new Error("test-failed");
      setMessage("Wysłano testowe powiadomienie.");
    } catch { setMessage("Nie udało się wysłać testowego powiadomienia."); }
    finally { setBusy(false); }
  };

  if (state === "loading" || state === "unavailable") return null;

  return (
    <section className="rounded-xl border border-border bg-white p-5" aria-labelledby="admin-push-title">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-brand-soft p-2 text-brand-dark" aria-hidden="true"><Bell size={19} /></span>
        <div className="min-w-0 flex-1">
          <h2 id="admin-push-title" className="text-base font-bold">Powiadomienia</h2>
          <p className="mt-1 text-sm text-muted-foreground">Otrzymuj ważne aktualizacje dotyczące dostępności miejsc.</p>
          {state === "denied" ? <p className="mt-3 text-sm font-semibold text-amber-800">Powiadomienia są zablokowane w ustawieniach przeglądarki.</p> : null}
          {message ? <p className="mt-3 text-sm text-muted-foreground" role="status">{message}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {state === "enabled" ? <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-bold hover:bg-surface-muted disabled:opacity-60" onClick={() => void disable()} disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Wyłącz na tym urządzeniu</button> : <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-dark px-4 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60" onClick={() => void enable()} disabled={busy || state === "denied"}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Bell size={16} />} Włącz powiadomienia</button>}
            {state === "enabled" ? <button type="button" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-bold hover:bg-surface-muted disabled:opacity-60" onClick={() => void sendTest()} disabled={busy}>Wyślij testowe powiadomienie</button> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
