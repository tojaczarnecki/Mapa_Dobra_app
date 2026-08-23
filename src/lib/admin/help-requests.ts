import type { HelpRequestNeed, HelpRequestStatus, HelpRequestUrgency } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const helpRequestStatusLabels: Record<HelpRequestStatus, string> = {
  NEW: "Nowe",
  REVIEWING: "W trakcie",
  FORWARDED: "Przekazane",
  RESOLVED: "Zakończone",
  REJECTED: "Odrzucone",
};

export const helpRequestUrgencyLabels: Record<HelpRequestUrgency, string> = {
  IMMEDIATE: "Bezpośrednie zagrożenie",
  STANDARD: "Wymaga uwagi",
  UNKNOWN: "Nieokreślona",
};

export const helpRequestNeedLabels: Record<HelpRequestNeed, string> = {
  SAFE_PLACE: "Bezpieczne miejsce lub nocleg",
  FOOD: "Posiłek lub żywność",
  CLOTHING_HYGIENE: "Odzież lub higiena",
  MEDICAL: "Możliwa pomoc medyczna",
  DAILY_FUNCTIONING: "Codzienne funkcjonowanie",
  OLDER_PERSON_SUPPORT: "Wsparcie starszej osoby",
  NO_SUPPORT_NETWORK: "Brak wsparcia bliskich",
  OUTDOOR_HARSH_CONDITIONS: "Trudne warunki na zewnątrz",
  DAILY_TASKS: "Zakupy lub codzienne sprawy",
  SAFETY_WELLBEING: "Bezpieczeństwo lub dobrostan",
  LOST_OR_DISORIENTED: "Zagubienie lub dezorientacja",
  OTHER: "Inne",
};

export async function getHelpRequestList(filters: {
  status?: HelpRequestStatus;
  urgency?: HelpRequestUrgency;
  need?: HelpRequestNeed;
}) {
  const requests = await prisma.helpRequest.findMany({ orderBy: { createdAt: "desc" } });
  return requests.filter((request) =>
    (!filters.status || request.status === filters.status) &&
    (!filters.urgency || request.urgency === filters.urgency) &&
    (!filters.need || request.needs.includes(filters.need)),
  );
}

export function getHelpRequest(id: string) {
  return prisma.helpRequest.findUnique({
    where: { id },
  });
}

export function getHelpRequestAudit(id: string) {
  return prisma.auditLog.findMany({
    where: { entityType: "HELP_REQUEST", entityId: id },
    orderBy: { createdAt: "desc" },
    include: { adminUser: { select: { displayName: true } } },
  });
}
