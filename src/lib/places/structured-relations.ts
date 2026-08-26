import type { Prisma } from "@/generated/prisma/client";
import { dictionarySlug, normalizeDictionaryLabel } from "@/lib/structured-data";
import type { AdminAccessibility, AdminRequirement } from "@/types/place-admin";

type Transaction = Prisma.TransactionClient;
type SocialLinkInput = { platform: "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "YOUTUBE" | "TIKTOK" | "OTHER"; url: string; label?: string };

const requirementKeys: Record<AdminRequirement["kind"], string | undefined> = {
  REFERRAL: "REFERRAL", DOCUMENT: "DOCUMENT", FEE: "FEE", LODZ_REGISTRATION: "LODZ_REGISTRATION", APPOINTMENT: "APPOINTMENT", OTHER: undefined,
};
const accessibilityKeys: Record<AdminAccessibility["feature"], string | undefined> = {
  STEP_FREE_ENTRANCE: "STEP_FREE_ENTRANCE", RAMP: "RAMP", ELEVATOR: "ELEVATOR", ACCESSIBLE_TOILET: "ACCESSIBLE_TOILET", ACCESSIBLE_SHOWER: "ACCESSIBLE_SHOWER", WHEELCHAIR_PLACE: "WHEELCHAIR_PLACE", ASSISTANCE_DOG: "ASSISTANCE_DOG", CARE_SERVICES: "CARE_SERVICES", STAY_WITH_ASSISTANT: "STAY_WITH_ASSISTANT", OTHER: undefined,
};

async function definitionId(transaction: Transaction, kind: "requirement" | "accessibility", systemKey: string | undefined, label: string) {
  const normalized = normalizeDictionaryLabel(label);
  const slug = `${kind}-${dictionarySlug(normalized) || "custom"}`;
  if (systemKey) {
    const existing = kind === "requirement"
      ? await transaction.requirementDefinition.findUnique({ where: { systemKey }, select: { id: true } })
      : await transaction.accessibilityDefinition.findUnique({ where: { systemKey }, select: { id: true } });
    if (existing) return existing.id;
  }
  if (kind === "requirement") {
    const existing = await transaction.requirementDefinition.findUnique({ where: { slug }, select: { id: true } });
    if (existing) return existing.id;
    return (await transaction.requirementDefinition.create({ data: { slug, label: normalized, sortOrder: 100 } })).id;
  }
  const existing = await transaction.accessibilityDefinition.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return existing.id;
  return (await transaction.accessibilityDefinition.create({ data: { slug, label: normalized, sortOrder: 100 } })).id;
}

export async function syncPlaceStructuredRelations(
  transaction: Transaction,
  placeId: string,
  requirements: AdminRequirement[],
  accessibility: AdminAccessibility[],
  audience: string[],
  socialLinks: SocialLinkInput[],
) {
  await transaction.placeRequirement.deleteMany({ where: { placeId } });
  await transaction.placeAccessibility.deleteMany({ where: { placeId } });
  await transaction.placeAudience.deleteMany({ where: { placeId } });
  await transaction.placeSocialLink.deleteMany({ where: { placeId } });

  const requirementRows = [];
  for (const [sortOrder, item] of requirements.entries()) requirementRows.push({ placeId, kind: item.kind, state: item.state, label: item.label, note: item.note || null, sortOrder, definitionId: await definitionId(transaction, "requirement", requirementKeys[item.kind], item.label) });
  if (requirementRows.length) await transaction.placeRequirement.createMany({ data: requirementRows });
  const accessibilityRows = [];
  for (const [sortOrder, item] of accessibility.entries()) accessibilityRows.push({ placeId, feature: item.feature, state: item.state, label: item.label, note: item.note || null, sortOrder, definitionId: await definitionId(transaction, "accessibility", accessibilityKeys[item.feature], item.label) });
  if (accessibilityRows.length) await transaction.placeAccessibility.createMany({ data: accessibilityRows });

  const audienceRows = [];
  for (const label of audience) {
    const normalized = normalizeDictionaryLabel(label);
    if (!normalized) continue;
    const slug = `audience-${dictionarySlug(normalized) || "custom"}`;
    const definition = await transaction.audienceDefinition.upsert({ where: { slug }, update: {}, create: { slug, label: normalized, sortOrder: 100 } });
    audienceRows.push({ placeId, definitionId: definition.id });
  }
  if (audienceRows.length) await transaction.placeAudience.createMany({ data: audienceRows, skipDuplicates: true });
  if (socialLinks.length) await transaction.placeSocialLink.createMany({ data: socialLinks.map((item, sortOrder) => ({ placeId, platform: item.platform, url: item.url, label: item.label || null, sortOrder })) });
}

export type { SocialLinkInput };
