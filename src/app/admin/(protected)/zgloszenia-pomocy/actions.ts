"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { HelpRequestStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/session";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const statuses = ["NEW", "REVIEWING", "FORWARDED", "RESOLVED", "REJECTED"] as const;

function validId(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function validStatus(value: FormDataEntryValue | null): value is HelpRequestStatus {
  return typeof value === "string" && statuses.includes(value as HelpRequestStatus);
}

function canMove(from: HelpRequestStatus, to: HelpRequestStatus) {
  if (from === to) return false;
  if (from === "RESOLVED" || from === "REJECTED") return false;
  return true;
}

export async function updateHelpRequestStatus(formData: FormData) {
  const session = await requirePermission("MANAGE_HELP_REQUESTS");
  const id = formData.get("id");
  const nextStatus = formData.get("status");
  const note = formData.get("note");
  if (!validId(id) || !validStatus(nextStatus) || (note !== null && typeof note !== "string") || (typeof note === "string" && note.length > 1000)) {
    redirect(`/admin/zgloszenia-pomocy/${typeof id === "string" ? id : ""}?error=invalid`);
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.helpRequest.findUnique({ where: { id }, select: { status: true } });
      if (!current || !canMove(current.status, nextStatus)) throw new Error("INVALID_TRANSITION");
      await transaction.helpRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          reviewedAt: nextStatus === "NEW" ? null : new Date(),
          resolvedAt: nextStatus === "RESOLVED" ? new Date() : null,
        },
      });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "HELP_REQUEST_STATUS_CHANGED",
          entityType: "HELP_REQUEST",
          entityId: id,
          note: typeof note === "string" && note.trim() ? note.trim() : null,
          previousValues: { status: current.status },
          newValues: { status: nextStatus },
        },
      });
    });
  } catch {
    redirect(`/admin/zgloszenia-pomocy/${id}?error=save`);
  }
  revalidatePath("/admin/zgloszenia-pomocy");
  revalidatePath(`/admin/zgloszenia-pomocy/${id}`);
  redirect(`/admin/zgloszenia-pomocy/${id}?saved=1`);
}

export async function saveHelpRequestNote(formData: FormData) {
  const session = await requirePermission("MANAGE_HELP_REQUESTS");
  const id = formData.get("id");
  const notes = formData.get("internalNotes");
  if (!validId(id) || typeof notes !== "string" || notes.length > 4000) redirect(`/admin/zgloszenia-pomocy/${typeof id === "string" ? id : ""}?error=invalid`);
  try {
    await prisma.$transaction(async (transaction) => {
      const previous = await transaction.helpRequest.findUnique({ where: { id }, select: { internalNotes: true } });
      if (!previous) throw new Error("NOT_FOUND");
      await transaction.helpRequest.update({ where: { id }, data: { internalNotes: notes.trim() || null } });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "HELP_REQUEST_NOTE_ADDED",
          entityType: "HELP_REQUEST",
          entityId: id,
          changedFields: ["internalNotes"],
          previousValues: { internalNotes: previous.internalNotes },
          newValues: { internalNotes: notes.trim() || null },
        },
      });
    });
  } catch {
    redirect(`/admin/zgloszenia-pomocy/${id}?error=save`);
  }
  revalidatePath(`/admin/zgloszenia-pomocy/${id}`);
  redirect(`/admin/zgloszenia-pomocy/${id}?saved=1`);
}
