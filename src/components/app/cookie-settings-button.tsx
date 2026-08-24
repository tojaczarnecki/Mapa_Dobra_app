"use client";

export function CookieSettingsButton() {
  return <button type="button" className="touch-target mt-2 inline-flex items-center justify-center rounded-lg border border-[#B8D8D4] px-5 py-3 font-medium text-[#18364D] hover:border-[#0F766E] hover:text-[#0F766E]" onClick={() => window.dispatchEvent(new Event("mapa-dobra:open-cookie-settings"))}>Otwórz ustawienia cookies</button>;
}
