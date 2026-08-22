type RequirementKind =
  | "REFERRAL"
  | "DOCUMENT"
  | "FEE"
  | "LODZ_REGISTRATION"
  | "APPOINTMENT"
  | "OTHER";

type InformationState = "YES" | "NO" | "UNKNOWN";

const controlledLabels: Record<Exclude<RequirementKind, "OTHER">, Record<InformationState, string>> = {
  REFERRAL: {
    YES: "Wymagane skierowanie",
    NO: "Bez skierowania",
    UNKNOWN: "Skierowanie: brak potwierdzonych danych",
  },
  DOCUMENT: {
    YES: "Wymagany dokument",
    NO: "Dokument niewymagany",
    UNKNOWN: "Dokument: brak potwierdzonych danych",
  },
  FEE: {
    YES: "Pomoc odpłatna",
    NO: "Bezpłatnie",
    UNKNOWN: "Odpłatność: brak potwierdzonych danych",
  },
  LODZ_REGISTRATION: {
    YES: "Wymagany ostatni meldunek w Łodzi",
    NO: "Ostatni meldunek w Łodzi niewymagany",
    UNKNOWN: "Meldunek w Łodzi: brak potwierdzonych danych",
  },
  APPOINTMENT: {
    YES: "Wymagane wcześniejsze umówienie",
    NO: "Wcześniejsze umówienie niewymagane",
    UNKNOWN: "Wcześniejsze umówienie: brak potwierdzonych danych",
  },
};

export function publicRequirementLabel(input: {
  kind: RequirementKind;
  state: InformationState;
  label: string;
}) {
  if (input.kind !== "OTHER") return controlledLabels[input.kind][input.state];
  if (input.state === "UNKNOWN") return `${input.label}: brak potwierdzonych danych`;
  return input.label;
}
