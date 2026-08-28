export const PRIVACY_CONSENT_KEY = "mapa-dobra:privacy-consent";
export const PRIVACY_CONSENT_COOKIE = "mapa_dobra_privacy_consent";

export type ConsentChoice = "necessary" | "all";

export function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === "necessary" || value === "all";
}

export function canLoadOptionalTechnologies(choice: ConsentChoice | null) {
  return choice === "all";
}
