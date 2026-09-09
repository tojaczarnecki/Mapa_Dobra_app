import { MapPin, ShieldCheck } from "lucide-react";
import type { HelpRequestNeed } from "@/generated/prisma/enums";
import { helpRequestNeedLabels } from "@/lib/help-requests/validation";

type HelpRequestReviewProps = {
  emergencyAnswer: "YES" | "NO" | "UNKNOWN" | null;
  addressText: string;
  locationDescription: string;
  latitude?: number;
  needs: HelpRequestNeed[];
  description: string;
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string;
};

function safetyLabel(answer: HelpRequestReviewProps["emergencyAnswer"]) {
  if (answer === "NO") return "Nie wskazano bezpośredniego zagrożenia";
  if (answer === "UNKNOWN") return "Nie wiadomo, czy istnieje bezpośrednie zagrożenie";
  if (answer === "YES") return "Wskazano bezpośrednie zagrożenie";
  return "Nie określono";
}

function locationLabel(props: Pick<HelpRequestReviewProps, "addressText" | "locationDescription" | "latitude">) {
  return props.addressText.trim()
    || props.locationDescription.trim()
    || (props.latitude !== undefined ? "Wskazano przybliżone miejsce na mapie" : "Nie wskazano");
}

function contactLabel(props: Pick<HelpRequestReviewProps, "reporterName" | "reporterPhone" | "reporterEmail">) {
  const contact = [props.reporterName.trim(), props.reporterPhone.trim(), props.reporterEmail.trim()].filter(Boolean);
  return contact.length ? contact.join(" · ") : "Anonimowo — bez danych kontaktowych";
}

export function HelpRequestReview(props: HelpRequestReviewProps) {
  const needs = props.needs.map((need) => helpRequestNeedLabels[need]);

  return (
    <>
      <div className="guided-flow-summary" aria-label="Podsumowanie informacji">
        <div>
          <span>Bezpieczeństwo</span>
          <strong>{safetyLabel(props.emergencyAnswer)}</strong>
        </div>
        <div>
          <span>Miejsce</span>
          <strong>{locationLabel(props)}</strong>
        </div>
        <div>
          <span>Sytuacja</span>
          <strong>{needs.join(" · ") || "Nie określono"}</strong>
        </div>
        <div>
          <span>Opis</span>
          <strong>{props.description.trim() || "Nie podano opisu"}</strong>
        </div>
        <div>
          <span>Kontakt zgłaszającego</span>
          <strong>{contactLabel(props)}</strong>
        </div>
      </div>

      <div className="guided-flow-note" role="note">
        <ShieldCheck aria-hidden="true" size={15} />
        <span>Po wysłaniu informacja trafi do prywatnej kolejki Dobrej Mapy. To nie jest wezwanie służb ani gwarancja interwencji lub czasu reakcji.</span>
      </div>
      <p className="guided-flow-note"><MapPin aria-hidden="true" size={15} /> Prywatne zgłoszenie — nie publikujemy treści ani dokładnej lokalizacji.</p>
    </>
  );
}
