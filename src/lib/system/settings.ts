import type { PublicNoticeLevel, SystemMode } from "@/generated/prisma/enums";

export const SYSTEM_SETTINGS_ID = "singleton";
export const SYSTEM_SETTINGS_ENTITY_ID = "00000000-0000-0000-0000-000000000001";

export type SystemState = {
  mode: SystemMode;
  maintenanceTitle: string;
  maintenanceMessage: string;
  noticeEnabled: boolean;
  noticeText: string;
  noticeLevel: PublicNoticeLevel;
  noticeDismissible: boolean;
  version: number;
  updatedAt: Date | null;
  updatedByAdminId: string | null;
};

export const defaultSystemState: SystemState = {
  mode: "NORMAL",
  maintenanceTitle: "Pracujemy nad Dobrą Mapą",
  maintenanceMessage: "Dobra Mapa jest chwilowo niedostępna. Spróbuj ponownie za jakiś czas.",
  noticeEnabled: false,
  noticeText: "",
  noticeLevel: "INFO",
  noticeDismissible: true,
  version: 1,
  updatedAt: null,
  updatedByAdminId: null,
};

function clean(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

type SystemSettingsRow = Partial<Omit<SystemState, "maintenanceTitle" | "maintenanceMessage" | "noticeText">> & {
  maintenanceTitle?: string | null;
  maintenanceMessage?: string | null;
  noticeText?: string | null;
};

export function toSystemState(row: SystemSettingsRow | null | undefined): SystemState {
  return {
    mode: row?.mode ?? defaultSystemState.mode,
    maintenanceTitle: clean(row?.maintenanceTitle, defaultSystemState.maintenanceTitle),
    maintenanceMessage: clean(row?.maintenanceMessage, defaultSystemState.maintenanceMessage),
    noticeEnabled: row?.noticeEnabled ?? defaultSystemState.noticeEnabled,
    noticeText: row?.noticeText?.trim() ?? defaultSystemState.noticeText,
    noticeLevel: row?.noticeLevel ?? defaultSystemState.noticeLevel,
    noticeDismissible: row?.noticeDismissible ?? defaultSystemState.noticeDismissible,
    version: row?.version ?? defaultSystemState.version,
    updatedAt: row?.updatedAt ?? defaultSystemState.updatedAt,
    updatedByAdminId: row?.updatedByAdminId ?? defaultSystemState.updatedByAdminId,
  };
}

export async function getSystemState(): Promise<SystemState> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.systemSettings.findUnique({ where: { id: SYSTEM_SETTINGS_ID } });
    return toSystemState(row);
  } catch (error) {
    console.error("[system] Nie udało się odczytać ustawień systemu. Fail-open: NORMAL.", error);
    return defaultSystemState;
  }
}

export const publicWriteBlockMessage = () =>
  "Ta funkcja jest chwilowo niedostępna. Możesz nadal korzystać z mapy i sprawdzać informacje.";

export function systemModeLabel(mode: SystemMode) {
  return mode === "READ_ONLY" ? "Tylko do odczytu" : mode === "MAINTENANCE" ? "Serwisowy" : "Normalny";
}

export function systemModeDescription(mode: SystemMode) {
  return mode === "READ_ONLY"
    ? "Publiczna aplikacja działa, ale formularze i akcje zapisu są wyłączone."
    : mode === "MAINTENANCE"
      ? "Publiczna aplikacja pokazuje ekran serwisowy. Panel administratora pozostaje dostępny."
      : "Publiczna aplikacja działa normalnie.";
}
