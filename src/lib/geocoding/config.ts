export function geocoderUserAgent(
  environment: Record<string, string | undefined> = process.env,
) {
  const configured = environment.GEOCODER_USER_AGENT?.trim();
  if (
    configured &&
    !/(CONTACT_EMAIL|CHANGE_ME|local address verification)/iu.test(configured)
  ) {
    return configured;
  }

  const contact = environment.GEOCODER_CONTACT_EMAIL?.trim();
  if (contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(contact)) {
    return `MapaDobra/1.0 (${contact})`;
  }

  if (environment.NODE_ENV === "production") {
    throw new Error(
      "Geokoder nie jest skonfigurowany. Uzupełnij kontakt administracyjny w konfiguracji środowiska.",
    );
  }

  return "MapaDobraDevelopment/1.0 (local development)";
}
