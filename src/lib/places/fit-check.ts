import type { DetailListItem } from "@/data/demo-place-details";

export type PlaceFitNeed = "no-referral" | "no-document" | "no-registration" | "free";
export type PlaceFitState = "ok" | "unknown" | "conflict";

export type PlaceFitResult = {
  need: PlaceFitNeed;
  state: PlaceFitState;
  label: string;
  source?: string;
};

const needDefinitions: Record<PlaceFitNeed, {
  label: string;
  terms: RegExp;
  positive: RegExp;
  negative: RegExp;
}> = {
  "no-referral": {
    label: "Nie mam skierowania",
    terms: /skierowan/iu,
    positive: /bez\s+skierowania|skierowanie\s+niewymagane|skierowan\w*\s+niewymagan/iu,
    negative: /wymag\w*\s+(jest\s+)?skierowan|skierowan\w*\s+wymagan/iu,
  },
  "no-document": {
    label: "Nie mam dokumentu",
    terms: /dokument|dow[oó]d/iu,
    positive: /dokument\w*\s+niewymagan|bez\s+dokument/iu,
    negative: /wymag\w*\s+(jest\s+)?dokument|dokument\w*\s+wymagan/iu,
  },
  "no-registration": {
    label: "Nie mam meldunku w Łodzi",
    terms: /meldun|zameldowan/iu,
    positive: /meldun\w*\s+niewymagan|zameldowan\w*\s+niewymagan|bez\s+meldunku/iu,
    negative: /wymag\w*\s+.*meldun|meldun\w*\s+wymagan|zameldowan\w*\s+wymagan/iu,
  },
  free: {
    label: "Potrzebuję bezpłatnej pomocy",
    terms: /bezp[łl]at|odp[łl]at|op[łl]at|p[łl]atn|koszt/iu,
    positive: /bezp[łl]at|za\s+darmo|bez\s+op[łl]at/iu,
    negative: /odp[łl]at|p[łl]atn|op[łl]ata|koszt/iu,
  },
};

function normalize(value: string) {
  return value.normalize("NFC").trim();
}

export function evaluatePlaceFit(
  items: DetailListItem[],
  needs: PlaceFitNeed[],
): PlaceFitResult[] {
  return needs.map((need) => {
    const definition = needDefinitions[need];
    const relevant = items.find((item) => definition.terms.test(normalize(item.label)));

    if (!relevant) {
      return { need, state: "unknown", label: definition.label };
    }

    const text = normalize(`${relevant.label} ${relevant.note ?? ""}`);
    if (relevant.status === "positive" || definition.positive.test(text)) {
      return { need, state: "ok", label: definition.label, source: relevant.label };
    }

    if (relevant.status === "warning" || definition.negative.test(text)) {
      return { need, state: "conflict", label: definition.label, source: relevant.label };
    }

    return { need, state: "unknown", label: definition.label, source: relevant.label };
  });
}

export function placeFitSummary(results: PlaceFitResult[]) {
  if (results.length === 0) return "idle" as const;
  if (results.some((result) => result.state === "conflict")) return "conflict" as const;
  if (results.some((result) => result.state === "unknown")) return "unknown" as const;
  return "ok" as const;
}

export const placeFitNeedOptions = (Object.entries(needDefinitions) as Array<[
  PlaceFitNeed,
  (typeof needDefinitions)[PlaceFitNeed],
]>).map(([value, definition]) => ({ value, label: definition.label }));
