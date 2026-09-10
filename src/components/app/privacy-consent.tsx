"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { isConsentChoice, PRIVACY_CONSENT_COOKIE, PRIVACY_CONSENT_KEY, type ConsentChoice } from "@/lib/privacy/consent";
import { PrivacyPolicyContent } from "@/components/app/privacy-policy-content";

function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(PRIVACY_CONSENT_KEY);
    return isConsentChoice(value) ? value : null;
  } catch {
    return null;
  }
}

export function PrivacyConsent({
  initialConsent,
  children,
}: {
  initialConsent: ConsentChoice | null;
  children: React.ReactNode;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyView, setPrivacyView] = useState<"consent" | "policy">("consent");
  const screenRef = useRef<HTMLDivElement>(null);
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
    () => initialConsent,
  );
  const isInitialVisit = consent === null;
  const isPolicyView = privacyView === "policy";

  useEffect(() => {
    const openSettings = () => {
      setPrivacyView("consent");
      setSettingsOpen(true);
    };
    window.addEventListener("mapa-dobra:open-cookie-settings", openSettings);
    return () => window.removeEventListener("mapa-dobra:open-cookie-settings", openSettings);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        screenRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])') ?? [],
      );
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
    screenRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [settingsOpen]);

  useEffect(() => {
    document.body.dataset.privacyScreenOpen = settingsOpen ? "true" : "false";
    return () => {
      delete document.body.dataset.privacyScreenOpen;
    };
  }, [settingsOpen]);

  const saveConsent = (choice: ConsentChoice) => {
    window.localStorage.setItem(PRIVACY_CONSENT_KEY, choice);
    document.cookie = `${PRIVACY_CONSENT_COOKIE}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event("mapa-dobra:consent-changed"));
    setSettingsOpen(false);
  };

  const openPolicy = () => {
    setPrivacyView("policy");
    setSettingsOpen(true);
  };

  return (
    <>
      {children}

      {isInitialVisit && !settingsOpen ? (
        <aside className="privacy-compact-notice" aria-label="Informacja o plikach cookies">
          <p className="privacy-compact-notice-copy">
            Używamy tylko niezbędnych cookies i pamięci przeglądarki, żeby Dobra Mapa działała poprawnie.
          </p>
          <div className="privacy-compact-notice-actions">
            <button type="button" className="privacy-compact-notice-link" onClick={openPolicy}>
              Więcej informacji
            </button>
            <button type="button" className="privacy-compact-notice-confirm" onClick={() => saveConsent("necessary")}>
              OK
            </button>
          </div>
        </aside>
      ) : null}

      {settingsOpen ? (
        <div className="privacy-consent-layer">
          <section className="privacy-consent-screen" aria-labelledby="privacy-consent-title">
            <div ref={screenRef} className="privacy-consent-content" tabIndex={-1}>
              <div className="privacy-consent-brand">
                <Image src="/brand/dobra-mapa-logo-header.svg" alt="Dobra Mapa" width={1926} height={378} className="privacy-consent-logo-asset" />
              </div>
              <div className="privacy-consent-panel">
                {isPolicyView ? (
                  <>
                    <p className="privacy-consent-eyebrow">INFORMACJE I DOKUMENTY</p>
                    <h1 id="privacy-consent-title">Polityka prywatności</h1>
                    <PrivacyPolicyContent />
                    <div className="privacy-consent-actions">
                      {isInitialVisit ? (
                        <button type="button" className="privacy-consent-primary" onClick={() => saveConsent("necessary")}>
                          Rozumiem
                        </button>
                      ) : null}
                      <button type="button" className="privacy-consent-text-button" onClick={() => setPrivacyView("consent")}>
                        Wróć
                      </button>
                      <button type="button" className="privacy-consent-text-button" onClick={() => setSettingsOpen(false)}>
                        Wróć do aplikacji
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="privacy-consent-eyebrow">INFORMACJE O APLIKACJI</p>
                    <h1 id="privacy-consent-title">Prywatność</h1>
                    <p>
                      Dobra Mapa korzysta z niezbędnych cookies oraz pamięci przeglądarki, żeby aplikacja działała, zapamiętywała ustawienia, zapisane miejsca i bezpieczne drafty formularzy. W tej wersji nie używamy reklamowych ani marketingowych technologii śledzących.
                    </p>
                    <div className="privacy-consent-category">
                      <div>
                        <h2>Niezbędne technologie</h2>
                        <p>Są potrzebne do podstawowych funkcji Dobrej Mapy i nie służą reklamie.</p>
                      </div>
                      <input type="checkbox" checked readOnly aria-label="Niezbędne technologie są aktywne" />
                    </div>
                    <div className="privacy-consent-actions">
                      <button type="button" className="privacy-consent-primary" onClick={() => saveConsent("necessary")}>
                        {isInitialVisit ? "Rozumiem" : "Zapisz ustawienia"}
                      </button>
                      <button type="button" className="privacy-consent-policy-link" onClick={() => setPrivacyView("policy")}>
                        Polityka prywatności
                      </button>
                      <button type="button" className="privacy-consent-text-button" onClick={() => setSettingsOpen(false)}>
                        Wróć do aplikacji
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
