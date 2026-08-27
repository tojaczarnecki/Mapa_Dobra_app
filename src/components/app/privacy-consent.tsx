"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isConsentChoice, PRIVACY_CONSENT_KEY, type ConsentChoice } from "@/lib/privacy/consent";

function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(PRIVACY_CONSENT_KEY);
    return isConsentChoice(value) ? value : null;
  } catch {
    return null;
  }
}

export function PrivacyConsent() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const consent = useSyncExternalStore(
    (onChange) => {
      const notify = () => onChange();
      window.addEventListener("storage", notify);
      window.addEventListener("mapa-dobra:consent-changed", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("mapa-dobra:consent-changed", notify);
      };
    },
    readConsent,
    () => null,
  );

  useEffect(() => {
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener("mapa-dobra:open-cookie-settings", openSettings);
    return () => window.removeEventListener("mapa-dobra:open-cookie-settings", openSettings);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && consent !== null) setSettingsOpen(false);
      if (event.key !== "Tab") return;

      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])') ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [consent, settingsOpen]);

  const saveConsent = (choice: ConsentChoice) => {
    window.localStorage.setItem(PRIVACY_CONSENT_KEY, choice);
    window.dispatchEvent(new Event("mapa-dobra:consent-changed"));
    setSettingsOpen(false);
  };

  const showPanel = consent === null || settingsOpen;
  if (!showPanel) return null;

  if (!settingsOpen) {
    return (
      <div className="privacy-consent-layer privacy-consent-layer-initial">
        <div
          ref={dialogRef}
          className="privacy-consent-panel privacy-consent-panel-initial"
          role="region"
          aria-labelledby="privacy-consent-title"
        >
          <div className="privacy-consent-initial-copy">
            <h2 id="privacy-consent-title">Prywatność</h2>
            <p>Używamy tylko technologii niezbędnych do działania Mapy Dobra i zapamiętania tego wyboru.</p>
          </div>
          <div className="privacy-consent-actions privacy-consent-actions-initial">
            <button type="button" className="privacy-consent-primary" onClick={() => saveConsent("necessary")}>Rozumiem</button>
            <button type="button" className="privacy-consent-text-button" onClick={() => setSettingsOpen(true)}>Więcej</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="privacy-consent-layer">
      <button
        type="button"
        className="privacy-consent-backdrop"
        aria-label="Zamknij ustawienia prywatności"
        onClick={() => consent !== null && setSettingsOpen(false)}
      />
      <div
        ref={dialogRef}
        className="privacy-consent-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-consent-title"
        tabIndex={-1}
      >
        <h2 id="privacy-consent-title">Ustawienia prywatności</h2>
        <p>Publiczna część Mapy Dobra nie korzysta obecnie z dodatkowych skryptów analitycznych ani marketingowych.</p>
        <div className="privacy-consent-category">
          <div>
            <h3>Niezbędne</h3>
            <p>Aktywne zawsze. Obejmują zapamiętanie tego wyboru, działanie PWA oraz techniczne elementy wymagane przez serwis.</p>
          </div>
          <input type="checkbox" checked readOnly aria-label="Technologie niezbędne są zawsze aktywne" />
        </div>
        <div className="privacy-consent-actions">
          <button type="button" className="privacy-consent-primary" onClick={() => saveConsent("necessary")}>Zapisz ustawienia</button>
          {consent !== null ? (
            <button type="button" className="privacy-consent-text-button" onClick={() => setSettingsOpen(false)}>Wróć</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
