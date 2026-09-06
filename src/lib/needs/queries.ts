import "server-only";
import { prisma } from "@/lib/prisma";
import { needHasAvailableCapacity } from "@/lib/needs/validation";

function activeNeedWhere() {
  return { type: "VOLUNTEERS" as const, status: "PUBLISHED" as const, endsAt: { gte: new Date() } };
}

export async function getPublicNeeds() {
  const needs = await prisma.organizationNeed.findMany({
    where: activeNeedWhere(),
    include: { organization: { select: { name: true } }, place: { select: { name: true, addressLine: true, city: true, slug: true, primaryCategory: { select: { slug: true } } } }, responses: { where: { status: "CONFIRMED" }, select: { id: true } } },
    orderBy: [{ startsAt: "asc" }, { publishedAt: "desc" }],
  });
  return needs.filter((need) => needHasAvailableCapacity(need.peopleNeeded, need.responses.length)).map(({ responses, ...need }) => ({ ...need, responsesCount: responses.length }));
}

export async function getPublicNeed(id: string) {
  const need = await prisma.organizationNeed.findFirst({
    where: { id, ...activeNeedWhere() },
    include: { organization: { select: { name: true } }, place: { select: { name: true, addressLine: true, city: true } }, responses: { where: { status: "CONFIRMED" }, select: { id: true } } },
  });
  if (!need) return null;
  const { responses, ...result } = need;
  return { ...result, responsesCount: responses.length };
}
