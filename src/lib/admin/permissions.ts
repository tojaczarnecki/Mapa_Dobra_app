import type {
  AdminPermission,
  AdminPermissionEffect,
  AdminRole,
} from "@/generated/prisma/enums";

export const allAdminPermissions: AdminPermission[] = [
  "VIEW_DASHBOARD",
  "VIEW_PLACES",
  "CREATE_PLACES",
  "EDIT_PLACES",
  "VERIFY_PLACES",
  "PUBLISH_PLACES",
  "CHANGE_PLACE_STATUS",
  "UPDATE_BED_AVAILABILITY",
  "UPDATE_ADMISSION_STATUS",
  "UPDATE_ADMISSION_HOURS",
  "UPDATE_PLACE_CONTACT",
  "UPDATE_PLACE_BASIC",
  "UPDATE_ACCOMMODATION_DETAILS",
  "UPDATE_TOTAL_CAPACITY",
  "MODERATE_SUBMISSIONS",
  "PUBLISH_SUBMISSIONS",
  "VIEW_ORGANIZATIONS",
  "MANAGE_ORGANIZATIONS",
  "VIEW_CATEGORIES",
  "MANAGE_CATEGORIES",
  "VIEW_IMPORTS",
  "MANAGE_IMPORTS",
  "VIEW_AUDIT_LOG",
  "MANAGE_USERS",
  "MANAGE_USER_PERMISSIONS",
  "VIEW_HELP_REQUESTS",
  "MANAGE_HELP_REQUESTS",
];

export const roleDefaultPermissions: Record<AdminRole, readonly AdminPermission[]> = {
  SUPER_ADMIN: allAdminPermissions,
  ADMIN: allAdminPermissions.filter(
    (permission) => permission !== "MANAGE_USERS" && permission !== "MANAGE_USER_PERMISSIONS",
  ),
  MODERATOR: [
    "VIEW_DASHBOARD",
    "VIEW_PLACES",
    "EDIT_PLACES",
    "VERIFY_PLACES",
    "MODERATE_SUBMISSIONS",
    "VIEW_ORGANIZATIONS",
    "VIEW_CATEGORIES",
    "VIEW_IMPORTS",
    "VIEW_HELP_REQUESTS",
    "MANAGE_HELP_REQUESTS",
  ],
  PLACE_MANAGER: ["VIEW_DASHBOARD"],
  VIEWER: [
    "VIEW_DASHBOARD",
    "VIEW_PLACES",
    "VIEW_ORGANIZATIONS",
    "VIEW_CATEGORIES",
    "VIEW_IMPORTS",
    "VIEW_AUDIT_LOG",
  ],
};

export const placeManagerDefaultPermissions: AdminPermission[] = [
  "VIEW_PLACES",
  "UPDATE_BED_AVAILABILITY",
  "UPDATE_ADMISSION_STATUS",
  "UPDATE_ADMISSION_HOURS",
];

export const placeScopedPermissions: AdminPermission[] = [
  "VIEW_PLACES",
  "VERIFY_PLACES",
  "UPDATE_BED_AVAILABILITY",
  "UPDATE_ADMISSION_STATUS",
  "UPDATE_ADMISSION_HOURS",
  "UPDATE_PLACE_CONTACT",
  "UPDATE_PLACE_BASIC",
  "UPDATE_ACCOMMODATION_DETAILS",
  "UPDATE_TOTAL_CAPACITY",
];

export const permissionLabels: Record<AdminPermission, string> = {
  VIEW_DASHBOARD: "Podgląd dashboardu",
  VIEW_PLACES: "Podgląd miejsc",
  CREATE_PLACES: "Tworzenie miejsc",
  EDIT_PLACES: "Edycja miejsc",
  VERIFY_PLACES: "Weryfikacja miejsca / potwierdzanie aktualności",
  PUBLISH_PLACES: "Publikowanie miejsc",
  CHANGE_PLACE_STATUS: "Zmiana statusu miejsca",
  UPDATE_BED_AVAILABILITY: "Wolne miejsca",
  UPDATE_ADMISSION_STATUS: "Status przyjęć",
  UPDATE_ADMISSION_HOURS: "Godziny przyjęć",
  UPDATE_PLACE_CONTACT: "Kontakt placówki",
  UPDATE_PLACE_BASIC: "Podstawowe dane placówki",
  UPDATE_ACCOMMODATION_DETAILS: "Pozostałe dane noclegowe",
  UPDATE_TOTAL_CAPACITY: "Całkowita pojemność",
  MODERATE_SUBMISSIONS: "Moderowanie zgłoszeń",
  PUBLISH_SUBMISSIONS: "Publikowanie zgłoszeń",
  VIEW_ORGANIZATIONS: "Podgląd organizacji",
  MANAGE_ORGANIZATIONS: "Zarządzanie organizacjami",
  VIEW_CATEGORIES: "Podgląd kategorii",
  MANAGE_CATEGORIES: "Zarządzanie kategoriami",
  VIEW_IMPORTS: "Podgląd importów",
  MANAGE_IMPORTS: "Zarządzanie importami",
  VIEW_AUDIT_LOG: "Podgląd historii działań",
  MANAGE_USERS: "Zarządzanie użytkownikami",
  MANAGE_USER_PERMISSIONS: "Zarządzanie uprawnieniami",
  VIEW_HELP_REQUESTS: "Podgląd zgłoszeń pomocy",
  MANAGE_HELP_REQUESTS: "Obsługa zgłoszeń pomocy",
};

export type PermissionOverride = {
  permission: AdminPermission;
  effect: AdminPermissionEffect;
};

export function resolveEffectivePermissions(
  role: AdminRole,
  overrides: readonly PermissionOverride[] = [],
) {
  const permissions = new Set<AdminPermission>(roleDefaultPermissions[role]);
  for (const override of overrides) {
    if (override.effect === "ALLOW") permissions.add(override.permission);
    else permissions.delete(override.permission);
  }
  return [...permissions];
}

export function hasPermission(
  permissions: readonly AdminPermission[],
  permission: AdminPermission,
) {
  return permissions.includes(permission);
}

export function permissionOrigin(
  role: AdminRole,
  overrides: readonly PermissionOverride[],
  permission: AdminPermission,
) {
  const override = overrides.find((item) => item.permission === permission);
  if (override) return override.effect === "ALLOW" ? "INDIVIDUAL_ALLOW" : "INDIVIDUAL_DENY";
  return roleDefaultPermissions[role].includes(permission) ? "ROLE" : "NONE";
}

export function canChangeAdminIdentity(input: {
  activeSuperAdminCount: number;
  targetIsActiveSuperAdmin: boolean;
  nextRole: AdminRole;
  nextActive: boolean;
}) {
  if (!input.targetIsActiveSuperAdmin) return true;
  if (input.nextRole === "SUPER_ADMIN" && input.nextActive) return true;
  return input.activeSuperAdminCount > 1;
}

export function hasPlaceScopedPermission(
  globalPermissions: readonly AdminPermission[],
  access: { active: boolean; permissions: readonly AdminPermission[] } | null,
  permission: AdminPermission,
) {
  return globalPermissions.includes(permission) || Boolean(access?.active && access.permissions.includes(permission));
}
