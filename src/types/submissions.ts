export type ModerationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type SubmitterContact = {
  name: string;
  email: string;
  phone: string;
};

export type SubmissionSource = {
  type: string;
  url: string;
};

type SubmissionBase = {
  createdAt: string;
  status: ModerationStatus;
  source: SubmissionSource;
  submitterContact: SubmitterContact;
};

export type PlaceUpdateType =
  | "hours"
  | "address"
  | "phone"
  | "online-contact"
  | "help-scope"
  | "requirements"
  | "temporary-closure"
  | "permanent-closure"
  | "accommodation-availability"
  | "accommodation-rules"
  | "other";

export type PlaceUpdateSubmission = SubmissionBase & {
  submissionType: "PLACE_UPDATE";
  placeId?: string;
  placeSlug?: string;
  placeReference: string;
  reportTypes: PlaceUpdateType[];
  description: string;
  proposedData: {
    hours: string;
    address: string;
    phone: string;
    closedSince: string;
  };
};

export type HelpCategory =
  | "food"
  | "accommodation"
  | "hygiene"
  | "clothing"
  | "medical"
  | "psychological"
  | "legal"
  | "social"
  | "other";

export type NewPlaceSubmission = SubmissionBase & {
  submissionType: "NEW_PLACE";
  placeId?: never;
  proposedData: {
    name: string;
    organizationName: string;
    organizationId?: string;
    helpCategories: HelpCategory[];
    address: {
      street: string;
      postalCode: string;
      city: string;
      district: string;
    };
    placeContact: {
      phone: string;
      email: string;
      website: string;
    };
    openingHours: string;
    description: string;
    conditions: string[];
    accommodation?: {
      facilityType: string;
      audiences: string[];
      availabilityKnown: "yes" | "no" | "";
      freePlaces: string;
      availabilityUpdated: string;
      availabilityUpdatedOther: string;
      admissionHours: string;
      sobriety: string;
      animals: string;
      accessibility: string[];
    };
  };
};

export type SubmissionProtectionFields = {
  contactWebsite: string;
};
