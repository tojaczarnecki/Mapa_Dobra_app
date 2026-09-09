"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/session";
import { SYSTEM_SETTINGS_ENTITY_ID, SYSTEM_SETTINGS_ID, toSystemState } from "@/lib/system/settings";

const modes = ["NORMAL", "READ_ONLY", "MAINTENANCE"] as const;
const levels = ["INFO", "WARNING", "CRITICAL"] as const;
type Mode = (typeof modes)[number];
type Level = (typeof levels)[number];

function field(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function safeCopy(value: string, fallback: string, max: number) {
  if (value.length > max || /<[a-z][\s\S]*>/iu.test(value)) throw new Error("INVALID_COPY");
  return value || fallback;
}

export async function updateSystemSettings(formData: FormData) {
  const session = await requirePermission("MANAGE_SYSTEM_SETTINGS");
  const mode = field(formData, "mode") as Mode;
  const noticeLevel = field(formData, "noticeLevel") as Level;
  if (!modes.includes(mode) || !levels.includes(noticeLevel)) redirect("/admin/system?error=invalid");

  let persisted;
  try {
    persisted = await prisma.systemSettings.findUnique({ where: { id: SYSTEM_SETTINGS_ID } });
  } catch (error) {
    console.error("[system] Nie udało się odczytać ustawień przed zapisem.", error);
    redirect("/admin/system?error=storage");
  }
  const current = toSystemState(persisted);
  const submittedVersion = Number(field(formData, "version"));
  if (!Number.isInteger(submittedVersion) || submittedVersion !== current.version) redirect("/admin/system?error=conflict");
  if (mode === "MAINTENANCE" && current.mode !== "MAINTENANCE" && field(formData, "confirmMaintenance") !== "1") redirect("/admin/system?error=confirm");

  let title: string;
  let message: string;
  let noticeText: string;
  try {
    title = safeCopy(field(formData, "maintenanceTitle"), "Pracujemy nad Dobrą Mapą", 200);
    message = safeCopy(field(formData, "maintenanceMessage"), "Dobra Mapa jest chwilowo niedostępna. Spróbuj ponownie za jakiś czas.", 2000);
    noticeText = safeCopy(field(formData, "noticeText"), "", 1000);
  } catch { redirect("/admin/system?error=invalid"); }

  const nextValues = { mode, maintenanceTitle: title!, maintenanceMessage: message!, noticeEnabled: formData.get("noticeEnabled") === "on", noticeText: noticeText!, noticeLevel, noticeDismissible: formData.get("noticeDismissible") === "on" };
  try {
    await prisma.$transaction(async (transaction) => {
      if (persisted) {
        const updated = await transaction.systemSettings.updateMany({ where: { id: SYSTEM_SETTINGS_ID, version: current.version }, data: { ...nextValues, version: { increment: 1 }, updatedByAdminId: session.user.id } });
        if (updated.count !== 1) throw new Error("SYSTEM_SETTINGS_CONFLICT");
      } else {
        await transaction.systemSettings.create({ data: { id: SYSTEM_SETTINGS_ID, ...nextValues, version: 2, updatedByAdminId: session.user.id } });
      }
      const previous = { mode: current.mode, maintenanceTitle: current.maintenanceTitle, maintenanceMessage: current.maintenanceMessage, noticeEnabled: current.noticeEnabled, noticeText: current.noticeText, noticeLevel: current.noticeLevel, noticeDismissible: current.noticeDismissible };
      const changed = Object.keys(nextValues).filter((key) => previous[key as keyof typeof previous] !== nextValues[key as keyof typeof nextValues] as never);
      if (!changed.length) return;
      const common = { entityType: "SYSTEM_SETTINGS" as const, entityId: SYSTEM_SETTINGS_ENTITY_ID, adminUserId: session.user.id, changedFields: changed, previousValues: previous, newValues: nextValues };
      if (current.mode !== mode) await transaction.auditLog.create({ data: { ...common, action: "SYSTEM_MODE_CHANGED" } });
      if (current.maintenanceTitle !== title || current.maintenanceMessage !== message) await transaction.auditLog.create({ data: { ...common, action: "SYSTEM_SETTINGS_UPDATED", changedFields: changed.filter((key) => key.startsWith("maintenance")) } });
      if (current.noticeEnabled !== nextValues.noticeEnabled || current.noticeText !== noticeText || current.noticeLevel !== noticeLevel || current.noticeDismissible !== nextValues.noticeDismissible) await transaction.auditLog.create({ data: { ...common, action: "PUBLIC_NOTICE_UPDATED", changedFields: changed.filter((key) => key.startsWith("notice")) } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SYSTEM_SETTINGS_CONFLICT") redirect("/admin/system?error=conflict");
    console.error("[system] Nie udało się zapisać ustawień systemu.", error);
    redirect("/admin/system?error=save");
  }
  revalidatePath("/admin");
  revalidatePath("/admin/system");
  revalidatePath("/", "layout");
  redirect("/admin/system?saved=1");
}
