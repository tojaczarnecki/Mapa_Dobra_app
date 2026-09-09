import "server-only";
import { prisma } from "@/lib/prisma";
import { needHasAvailableCapacity } from "@/lib/needs/validation";

function activeNeedWhere(now = new Date()) {
  return {
    type: "VOLUNTEERS" as const,
    status: "PUBLISHED" as const,
    endsAt: { gt: now },
  };
}

function openSignupWhere(now = new Date()) {
  return {
    ...activeNeedWhere(now),
    OR: [
      { signupDeadline: null },
      { signupDeadline: { gt: now } },
    ],
  };
}

export async function getPublicNeeds() {
  const now = new Date();
  const needs = await prisma.organizationNeed.findMany({
    // The public list is a list of opportunities a person can still join.
    where: openSignupWhere(now),
    include: { organization: { select: { name: true } }, place: { select: { name: true, addressLine: true, city: true, slug: true, primaryCategory: { select: { slug: true } } } }, responses: { where: { status: "CONFIRMED" }, select: { id: true } } },
    orderBy: [{ startsAt: "asc" }, { publishedAt: "desc" }],
  });
  return needs.filter((need) => needHasAvailableCapacity(need.peopleNeeded, need.responses.length)).map(({ responses, ...need }) => ({ ...need, responsesCount: responses.length }));
}

export async function getPublicNeed(id: string) {
  const now = new Date();
  const need = await prisma.organizationNeed.findFirst({
    // Direct links stay readable until the activity ends, even after signup closes.
    // The detail page decides whether the response form is still available.
    where: { id, ...activeNeedWhere(now) },
    include: { organization: { select: { name: true } }, place: { select: { name: true, addressLine: true, city: true, latitude: true, longitude: true } }, responses: { where: { status: "CONFIRMED" }, select: { id: true } } },
  });
  if (!need) return null;
  const { responses, ...result } = need;
  return { ...result, responsesCount: responses.length };
}
