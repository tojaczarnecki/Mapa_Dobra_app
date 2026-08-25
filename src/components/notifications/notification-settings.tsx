"use client";

import { Bell, BellOff, Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

type Preferences = {
  localAlerts: boolean;
  savedPlaces: boolean;
  guides: boolean;
  volunteering: boolean;
  partnerContent: boolean;
  quietHoursFrom: string | null;
  quietHoursTo: string | null;
};

type PushSubscriptionJson = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const defaultPreferences: Preferences = {
  localAlerts: true,
  savedPlaces: true,
  guides: true,
  volunteering: true,
  partnerContent: false,
  quietHoursFrom: null,
  quietHoursTo: null,
};

function supported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

function base64ToBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

function subscriptionJson(subscription: PushSubscription): PushSubscriptionJson {
  const json = subscription.toJSON();
  return { endpoint: subscription.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } };
}

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const permissionTimer = window.setTimeout(() => {
      setPermission(supported() ? Notification.permission : "unsupported");
    }, 0);
    if (!supported()) return () => window.clearTimeout(permissionTimer);
    navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then(async (nextSubscription) => {
      setSubscription(nextSubscription);
      if (!nextSubscription) return;
      const response = await fetch("/api/notifications/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: { ...subscriptionJson(nextSubscription), userAgent: navigator.userAgent, locale: navigator.language } }),
      });
      if (response.ok) {
        const data = await response.json() as { preferences?: Preferences };
        if (data.preferences) setPreferences(data.preferences);
      }
    }).catch(() => undefined);
    return () => window.clearTimeout(permissionTimer);
  }, []);

  const enable = async () => {
    if (!supported()) return;
    setBusy(true);
    setMessage(null);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        setMessage(nextPermission === "denied" ? "Powiadomienia są zablokowane. Możesz zmienić to w ustawieniach przeglądarki." : "Nie włączono powiadomień.");
        return;
      }
      const keyResponse = await fetch("/api/notifications/vapid-public-key", { cache: "no-store" });
      if (!keyResponse.ok) throw new Error("config");
      const { publicKey } = await keyResponse.json() as { publicKey: string };
      const registration = await navigator.serviceWorker.ready;
      const nextSubscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) });
      const response = await fetch("/api/notifications/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: { ...subscriptionJson(nextSubscription), userAgent: navigator.userAgent, locale: navigator.language } }),
      });
      if (!response.ok) throw new Error("save");
      setSubscription(nextSubscription);
      setMessage("Powiadomienia są włączone.");
    } catch {
      setMessage("Nie udało się włączyć powiadomień. Spróbuj ponownie później.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!subscription) return;
    setBusy(true);
    try {
      await fetch("/api/notifications/subscription", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscriptionJson(subscription) }) });
      await subscription.unsubscribe();
      setSubscription(null);
      setMessage("Powiadomienia zostały wyłączone.");
    } finally {
      setBusy(false);
    }
  };

  const updatePreferences = async (key: keyof Preferences, value: boolean) => {
    if (!subscription) return;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    await fetch("/api/notifications/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscriptionJson(subscription), preferences: next }) });
  };

  if (permission === "unsupported") {
    return <p className="notification-settings-notice">Powiadomienia nie są dostępne w tej przeglądarce.</p>;
  }

  return <section className="notification-settings" aria-labelledby="notification-settings-title">
    <div className="notification-settings-header">
      <div><p className="public-page-eyebrow">USTAWIENIA URZĄDZENIA</p><h2 id="notification-settings-title">Powiadomienia</h2></div>
      {subscription ? <Bell aria-hidden="true" size={24} /> : <BellOff aria-hidden="true" size={24} />}
    </div>
    <p className="notification-settings-intro">Wybierz tylko te informacje, które mogą przydać Ci się lokalnie. Nie wysyłamy powiadomień marketingowych bez osobnej zgody.</p>
    {permission === "denied" ? <p className="notification-settings-notice">Powiadomienia są zablokowane w przeglądarce. Zmień uprawnienie w ustawieniach tej witryny, aby je włączyć.</p> : null}
    {!subscription && permission !== "denied" ? <button type="button" className="notification-settings-primary" disabled={busy} onClick={() => void enable()}>{busy ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <Bell aria-hidden="true" size={18} />}Włącz powiadomienia</button> : null}
    {subscription ? <>
      <div className="notification-settings-status"><Check aria-hidden="true" size={17} />Powiadomienia są włączone na tym urządzeniu.</div>
      <div className="notification-settings-options">
        {([["localAlerts", "Ważne lokalnie", "Zmiany i komunikaty dotyczące pomocy w Twoim otoczeniu."], ["savedPlaces", "Zapisane miejsca", "Istotne zmiany w zapisanych miejscach."], ["guides", "Poradniki", "Nowe, wybrane materiały Encyklopedii Dobra."], ["volunteering", "Wolontariat", "Wybrane informacje o zaangażowaniu i wydarzeniach."], ["partnerContent", "Treści partnerskie", "Osobna zgoda na treści od partnerów."]] as const).map(([key, label, description]) => <label className="notification-settings-option" key={key}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={preferences[key]} onChange={(event) => void updatePreferences(key, event.target.checked)} /></label>)}
      </div>
      <button type="button" className="notification-settings-secondary" disabled={busy} onClick={() => void disable()}>Wyłącz powiadomienia na tym urządzeniu</button>
    </> : null}
    {message ? <p className="notification-settings-message" role="status">{message}</p> : null}
  </section>;
}
