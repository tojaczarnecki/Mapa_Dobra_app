export type TriState = "YES" | "NO" | "UNKNOWN";
export type PlacePublicationStatusValue =
  | "DRAFT"
  | "PUBLISHED"
  | "TEMPORARILY_CLOSED"
  | "PERMANENTLY_CLOSED"
  | "ARCHIVED";
export type PlaceOperationalStatusValue = "OPEN" | "CLOSED" | "OPEN_TODAY" | "UNKNOWN";
export type PlaceRecordKindValue = "PRODUCTION" | "DEMO" | "TEST";
export type PlaceProfileKindValue = "SUPPORT" | "ACCOMMODATION" | "FOOD_SHARING" | "MOBILE_SERVICE";
export type WeekdayValue =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";
export type OpeningStatusValue = "OPEN" | "CLOSED" | "UNKNOWN";
export type RequirementKindValue =
  | "REFERRAL"
  | "DOCUMENT"
  | "FEE"
  | "LODZ_REGISTRATION"
  | "APPOINTMENT"
  | "OTHER";
export type AccessibilityFeatureValue =
  | "STEP_FREE_ENTRANCE"
  | "RAMP"
  | "ELEVATOR"
  | "ACCESSIBLE_TOILET"
  | "ACCESSIBLE_SHOWER"
  | "WHEELCHAIR_PLACE"
  | "ASSISTANCE_DOG"
  | "CARE_SERVICES"
  | "STAY_WITH_ASSISTANT"
  | "OTHER";
export type AccommodationTypeValue =
  | "SHELTER"
  | "NIGHT_SHELTER"
  | "WARMING_CENTER"
  | "HOSTEL"
  | "INTERVENTION_HOSTEL"
  | "CARE_SHELTER"
  | "WOMEN_WITH_CHILDREN_HOME"
  | "OTHER";
export type AccommodationAvailabilityValue =
  | "AVAILABLE"
  | "FEW"
  | "FULL"
  | "UNKNOWN"
  | "STALE"
  | "SUSPENDED";
export type SobrietyPolicyValue =
  | "SOBRIETY_REQUIRED"
  | "ZERO_TOLERANCE"
  | "INDIVIDUAL_ASSESSMENT"
  | "SEPARATE_PROCEDURE"
  | "UNKNOWN";
export type PetPolicyValue =
  | "ACCEPTED"
  | "NOT_ACCEPTED"
  | "DOG_ONLY"
  | "BY_ARRANGEMENT"
  | "ASSISTANCE_DOG_ONLY"
  | "UNKNOWN";
export type VerificationSourceValue =
  | "PHONE_CALL"
  | "ORGANIZATION_EMAIL"
  | "VISIT"
  | "OFFICIAL_WEBSITE"
  | "SOCIAL_MEDIA"
  | "OTHER";

export type AdminOpeningDay = {
  weekday: WeekdayValue;
  status: OpeningStatusValue;
  allDay?: boolean;
  periods: Array<{ opensAt: string; closesAt: string }>;
  note: string;
};

export type AdminMobileStop = {
  id?: string;
  name: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  note: string;
  sortOrder: number;
  schedules: Array<{
    weekday: WeekdayValue;
    allDay: boolean;
    opensAt: string;
    closesAt: string;
    note: string;
  }>;
};

export type AdminMobileSeason = {
  active: boolean;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  label: string;
};

export type AdminRequirement = {
  kind: RequirementKindValue;
  state: TriState;
  label: string;
  note: string;
};

export type AdminAccessibility = {
  feature: AccessibilityFeatureValue;
  state: TriState;
  label: string;
  note: string;
};

export type AdminCapacityGroup = {
  id?: string;
  label: string;
  totalBeds: number | null;
  availableBeds: number | null;
  active: boolean;
};

export type AdminAccommodation = {
  type: AccommodationTypeValue;
  audienceLabel: string;
  targetGroups: string[];
  acceptedProfiles: string[];
  admissionHoursDescription: string;
  acceptsToday: TriState;
  lodzRegistrationRequired: TriState;
  referralRequired: TriState;
  documentRequired: TriState;
  sobrietyPolicy: SobrietyPolicyValue;
  sobrietyNote: string;
  petPolicy: PetPolicyValue;
  petNote: string;
  wheelchairAccessibility: TriState;
  careServices: TriState;
  partialDependencySupport: TriState;
  mealsInfo: string;
  hygieneInfo: string;
  luggageInfo: string;
  returnTimeInfo: string;
  maxStayInfo: string;
  feeInfo: string;
  availabilityState: AccommodationAvailabilityValue;
  availabilityLabel: string;
  availabilityNote: string;
  importantNote: string;
  capacityGroups: AdminCapacityGroup[];
};

export type PlaceAdminPayload = {
  id?: string;
  placeKind: PlaceProfileKindValue;
  name: string;
  slug: string;
  organizationId: string;
  primaryCategorySlug: string;
  categorySlugs: string[];
  typeLabel: string;
  description: string;
  street: string;
  buildingNumber: string;
  addressLine: string;
  postalCode: string;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string;
  website: string;
  socialMedia: string;
  publicationStatus: PlacePublicationStatusValue;
  operationalStatus: PlaceOperationalStatusValue;
  todayHoursLabel: string;
  audience: string[];
  services: string[];
  openingHours: {
    operation: AdminOpeningDay[];
    admission: AdminOpeningDay[];
  };
  mobileStops: AdminMobileStop[];
  mobileSeason?: AdminMobileSeason;
  requirements: AdminRequirement[];
  accessibility: AdminAccessibility[];
  isAccommodation: boolean;
  accommodation?: AdminAccommodation;
  markVerified: boolean;
  verificationSource?: VerificationSourceValue;
  internalNote: string;
};

export type PlaceFormActionState = {
  error?: string;
  success?: string;
  placeId?: string;
};

export type QuickAvailabilityActionState = {
  error?: string;
  success?: string;
};
