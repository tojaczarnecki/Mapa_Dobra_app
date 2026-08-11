import {
  HelpCategory,
  InformationState,
  PlaceUpdateType,
  SubmissionSourceType,
} from "@/generated/prisma/enums";
import type {
  ValidNewPlaceSubmission,
  ValidPlaceUpdateSubmission,
} from "./validation";

const placeUpdateTypeMap = {
  hours: PlaceUpdateType.HOURS,
  address: PlaceUpdateType.ADDRESS,
  phone: PlaceUpdateType.PHONE,
  "online-contact": PlaceUpdateType.ONLINE_CONTACT,
  "help-scope": PlaceUpdateType.HELP_SCOPE,
  requirements: PlaceUpdateType.REQUIREMENTS,
  "temporary-closure": PlaceUpdateType.TEMPORARY_CLOSURE,
  "permanent-closure": PlaceUpdateType.PERMANENT_CLOSURE,
  "accommodation-availability": PlaceUpdateType.ACCOMMODATION_AVAILABILITY,
  "accommodation-rules": PlaceUpdateType.ACCOMMODATION_RULES,
  other: PlaceUpdateType.OTHER,
} as const;

const helpCategoryMap = {
  food: HelpCategory.FOOD,
  accommodation: HelpCategory.ACCOMMODATION,
  hygiene: HelpCategory.HYGIENE,
  clothing: HelpCategory.CLOTHING,
  medical: HelpCategory.MEDICAL,
  psychological: HelpCategory.PSYCHOLOGICAL,
  legal: HelpCategory.LEGAL,
  social: HelpCategory.SOCIAL,
  other: HelpCategory.OTHER,
} as const;

const sourceTypeMap = {
  visited: SubmissionSourceType.VISITED,
  "used-help": SubmissionSourceType.USED_HELP,
  staff: SubmissionSourceType.STAFF,
  phone: SubmissionSourceType.PHONE,
  website: SubmissionSourceType.WEBSITE,
  social: SubmissionSourceType.SOCIAL,
  volunteer: SubmissionSourceType.VOLUNTEER,
  recommendation: SubmissionSourceType.RECOMMENDATION,
  other: SubmissionSourceType.OTHER,
  "prefer-not": SubmissionSourceType.PREFER_NOT,
} as const;

const informationStateMap = {
  YES: InformationState.YES,
  NO: InformationState.NO,
  UNKNOWN: InformationState.UNKNOWN,
} as const;

export function toPlaceUpdateCreateData(data: ValidPlaceUpdateSubmission) {
  return {
    requestId: data.requestId,
    placeId: data.placeId,
    placeSlug: data.placeSlug,
    placeNameSnapshot: data.placeNameSnapshot,
    submissionTypes: data.submissionTypes.map((value) => placeUpdateTypeMap[value]),
    description: data.description,
    proposedPhone: data.proposedPhone,
    proposedAddress: data.proposedAddress,
    proposedOpeningHours: data.proposedOpeningHours,
    proposedWebsite: data.proposedWebsite,
    proposedOtherValue: data.proposedOtherValue,
    sourceType: data.sourceType ? sourceTypeMap[data.sourceType] : undefined,
    sourceUrl: data.sourceUrl,
    reporterName: data.reporterName,
    reporterEmail: data.reporterEmail,
    reporterPhone: data.reporterPhone,
  };
}

export function toNewPlaceCreateData(data: ValidNewPlaceSubmission) {
  return {
    requestId: data.requestId,
    name: data.name,
    organizationName: data.organizationName,
    categories: data.categories.map((value) => helpCategoryMap[value]),
    streetAddress: data.streetAddress,
    postalCode: data.postalCode,
    city: data.city,
    district: data.district,
    phone: data.phone,
    email: data.email,
    website: data.website,
    openingHoursDescription: data.openingHoursDescription,
    description: data.description,
    requirements: data.requirements,
    sourceType: data.sourceType ? sourceTypeMap[data.sourceType] : undefined,
    sourceUrl: data.sourceUrl,
    reporterName: data.reporterName,
    reporterEmail: data.reporterEmail,
    reporterPhone: data.reporterPhone,
    accommodationType: data.accommodationType,
    targetGroups: data.targetGroups,
    availabilityKnown: data.availabilityKnown
      ? informationStateMap[data.availabilityKnown]
      : undefined,
    availableBedsReported: data.availableBedsReported,
    availabilityReportedAt: data.availabilityReportedAt,
    availabilityReportedDescription: data.availabilityReportedDescription,
    admissionHoursDescription: data.admissionHoursDescription,
    sobrietyPolicy: data.sobrietyPolicy,
    petPolicy: data.petPolicy,
    accessibilityFeatures: data.accessibilityFeatures,
  };
}
