"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireNeedPermission, requirePermission, requirePlacePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { canDecideVolunteerResponse, needHasAvailableCapacity, shouldReopenFilledNeed, statusAfterConfirmedResponse, validateNeedInput } from "@/lib/needs/validation";

export type NeedActionState = { error?: string; success?: string };

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item : "";
}

function refresh(placeId: string | null) {
  if (placeId) revalidatePath(`/admin/moje-miejsca/${placeId}`);
  revalidatePath("/admin/potrzeby");
  revalidatePath("/potrzeby");
}

export async function createNeed(placeId: string, _state: NeedActionState, formData: FormData): Promise<NeedActionState> {
  const session = await requirePlacePermission("MANAGE_VOLUNTEER_NEEDS", placeId);
  const validation = validateNeedInput({
    title: value(formData, "title"), description: value(formData, "description"), peopleNeeded: value(formData, "peopleNeeded"),
    startsAt: value(formData, "startsAt"), endsAt: value(formData, "endsAt"), signupDeadline: value(formData, "signupDeadline"),
    experienceRequired: formData.get("experienceRequired") === "true", requirements: value(formData, "requirements"), locationNote: value(formData, "locationNote"),
  });
  if (!validation.ok) return { error: validation.message };
  const status = formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const place = await prisma.place.findUnique({ where: { id: placeId }, select: { organizationId: true } });
  if (!place?.organizationId) return { error: "Ta placówka nie ma przypisanej organizacji." };
  await prisma.organizationNeed.create({ data: { ...validation.data, type: "VOLUNTEERS", status, publishedAt: status === "PUBLISHED" ? new Date() : null, createdByAdminUserId: session.user.id, updatedByAdminUserId: session.user.id, organizationId: place.organizationId, placeId } });
  refresh(placeId);
  return { success: status === "PUBLISHED" ? "Potrzeba została opublikowana." : "Szkic potrzeby został zapisany." };
}

export async function createNeedForOrganization(_state: NeedActionState, formData: FormData): Promise<NeedActionState> {
  const session = await requirePermission("MANAGE_VOLUNTEER_NEEDS");
  const organizationId = value(formData, "organizationId");
  const placeId = value(formData, "placeId") || null;
  const validation = validateNeedInput({
    title: value(formData, "title"), description: value(formData, "description"), peopleNeeded: value(formData, "peopleNeeded"),
    startsAt: value(formData, "startsAt"), endsAt: value(formData, "endsAt"), signupDeadline: value(formData, "signupDeadline"),
    experienceRequired: formData.get("experienceRequired") === "true", requirements: value(formData, "requirements"), locationNote: value(formData, "locationNote"),
  });
  if (!validation.ok) return { error: validation.message };
  if (!organizationId) return { error: "Wybierz organizację." };

  const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { active: true } });
  if (!organization?.active) return { error: "Wybierz aktywną organizację." };
  if (placeId && !(await prisma.place.findFirst({ where: { id: placeId, organizationId }, select: { id: true } }))) return { error: "Wybrana placówka nie należy do tej organizacji." };

  const status = formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  await prisma.organizationNeed.create({
    data: {
      ...validation.data,
      type: "VOLUNTEERS",
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      createdByAdminUserId: session.user.id,
      updatedByAdminUserId: session.user.id,
      organizationId,
      placeId,
    },
  });
  refresh(placeId);
  redirect(`/admin/potrzeby?created=${status === "PUBLISHED" ? "published" : "draft"}`);
}

export async function updateNeed(needId: string, placeId: string | null, _state: NeedActionState, formData: FormData): Promise<NeedActionState> {
  const session = await requireNeedPermission(placeId);
  const validation = validateNeedInput({
    title: value(formData, "title"), description: value(formData, "description"), peopleNeeded: value(formData, "peopleNeeded"),
    startsAt: value(formData, "startsAt"), endsAt: value(formData, "endsAt"), signupDeadline: value(formData, "signupDeadline"),
    experienceRequired: formData.get("experienceRequired") === "true", requirements: value(formData, "requirements"), locationNote: value(formData, "locationNote"),
  });
  if (!validation.ok) return { error: validation.message };
  const status = formData.get("status") === "PUBLISHED" ? "PUBLISHED" : formData.get("status") === "CANCELLED" ? "CANCELLED" : "DRAFT";
  if (status === "PUBLISHED") {
    const existing = await prisma.organizationNeed.findFirst({ where: { id: needId, ...(placeId ? { placeId } : {}) }, select: { peopleNeeded: true, responses: { where: { status: "CONFIRMED" }, select: { id: true } } } });
    if (!existing) return { error: "Nie znaleziono potrzeby w tej placówce." };
    if (!needHasAvailableCapacity(existing.peopleNeeded, existing.responses.length)) return { error: "Nie można opublikować potrzeby: potwierdzono już wszystkie potrzebne osoby." };
  }
  const result = await prisma.organizationNeed.updateMany({ where: { id: needId, ...(placeId ? { placeId } : {}) }, data: { ...validation.data, status, publishedAt: status === "PUBLISHED" ? new Date() : undefined, closedAt: status === "CANCELLED" ? new Date() : undefined, updatedByAdminUserId: session.user.id } });
  if (!result.count) return { error: "Nie znaleziono potrzeby w tej placówce." };
  refresh(placeId);
  return { success: "Potrzeba została zapisana." };
}

export async function changeNeedStatus(needId: string, placeId: string | null, status: "PUBLISHED" | "FILLED" | "CANCELLED"): Promise<NeedActionState> {
  const session = await requireNeedPermission(placeId);
  try {
    const updated = await prisma.$transaction(async (transaction) => {
      const need = await transaction.organizationNeed.findFirst({ where: { id: needId, ...(placeId ? { placeId } : {}) }, select: { peopleNeeded: true, responses: { where: { status: "CONFIRMED" }, select: { id: true } } } });
      if (!need) return false;
      if (status === "PUBLISHED" && !needHasAvailableCapacity(need.peopleNeeded, need.responses.length)) throw new Error("NEED_FULL");
      await transaction.organizationNeed.update({ where: { id: needId }, data: { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined, closedAt: status === "PUBLISHED" ? null : new Date(), updatedByAdminUserId: session.user.id } });
      return true;
    }, { isolationLevel: "Serializable" });
    if (!updated) return { error: "Nie znaleziono potrzeby w tej placówce." };
  } catch (error) {
    if (error instanceof Error && error.message === "NEED_FULL") return { error: "Nie można otworzyć potrzeby: potwierdzono już wszystkie potrzebne osoby." };
    return { error: "Nie udało się zmienić statusu potrzeby." };
  }
  refresh(placeId);
  return { success: status === "PUBLISHED" ? "Potrzeba została opublikowana." : "Status potrzeby został zmieniony." };
}

export async function publishNeed(needId: string, placeId: string | null, _state: NeedActionState, _formData: FormData): Promise<NeedActionState> {
  void _state;
  void _formData;
  return changeNeedStatus(needId, placeId, "PUBLISHED");
}

export async function changeNeedStatusForm(needId: string, placeId: string | null, status: "PUBLISHED" | "FILLED" | "CANCELLED", _formData: FormData): Promise<void> {
  void _formData;
  await changeNeedStatus(needId, placeId, status);
}

export async function changeResponseStatus(responseId: string, placeId: string | null, status: "NEW" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED", state?: NeedActionState): Promise<NeedActionState> {
  void state;
  const session = await requireNeedPermission(placeId);
  try {
    await prisma.$transaction(async (transaction) => {
      const response = await transaction.volunteerNeedResponse.findFirst({ where: { id: responseId, ...(placeId ? { need: { placeId } } : {}) }, select: { status: true, needId: true } });
      if (!response) throw new Error("RESPONSE_NOT_FOUND");
      if (status === "CONFIRMED" || status === "DECLINED") {
        const need = await transaction.organizationNeed.findUniqueOrThrow({ where: { id: response.needId }, select: { status: true, peopleNeeded: true, responses: { where: { status: "CONFIRMED" }, select: { id: true } } } });
        if (!canDecideVolunteerResponse(need.status, response.status, status)) throw new Error("RESPONSE_NOT_DECIDABLE");
        if (status === "CONFIRMED" && need.responses.length >= need.peopleNeeded) throw new Error("NEED_FULL");
      }
      await transaction.volunteerNeedResponse.update({ where: { id: responseId }, data: { status } });
      if (status === "CONFIRMED") {
        const confirmedCount = await transaction.volunteerNeedResponse.count({ where: { needId: response.needId, status: "CONFIRMED" } });
        const need = await transaction.organizationNeed.findUniqueOrThrow({ where: { id: response.needId }, select: { status: true, peopleNeeded: true } });
        if (statusAfterConfirmedResponse(need.status, need.peopleNeeded, confirmedCount) === "FILLED") await transaction.organizationNeed.update({ where: { id: response.needId }, data: { status: "FILLED", closedAt: new Date() } });
      }
      if (status === "NEW" && response.status === "CONFIRMED") {
        const need = await transaction.organizationNeed.findUniqueOrThrow({ where: { id: response.needId }, select: { status: true, peopleNeeded: true, responses: { where: { status: "CONFIRMED" }, select: { id: true } } } });
        if (shouldReopenFilledNeed(need.status, response.status, status, need.responses.length, need.peopleNeeded)) {
          await transaction.organizationNeed.update({ where: { id: response.needId }, data: { status: "PUBLISHED", closedAt: null } });
        }
      }
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof Error && error.message === "NEED_FULL") return { error: "Nie można potwierdzić zgłoszenia: potrzeba ma już komplet potwierdzonych osób." };
    if (error instanceof Error && error.message === "RESPONSE_NOT_DECIDABLE") return { error: "Decyzję można zmienić tylko dla nowego zgłoszenia opublikowanej potrzeby." };
    if (error instanceof Error && error.message === "RESPONSE_NOT_FOUND") return { error: "Nie znaleziono tego zgłoszenia w tej placówce." };
    return { error: "Nie udało się zmienić statusu zgłoszenia." };
  }
  void session;
  refresh(placeId);
  return { success: status === "CONFIRMED" ? "Udział został potwierdzony." : status === "DECLINED" ? "Zgłoszenie zostało odrzucone." : status === "NEW" ? "Decyzja została cofnięta." : "Status zgłoszenia został zmieniony." };
}

export async function changeResponseStatusForm(responseId: string, placeId: string | null, status: "NEW" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED", _formData: FormData): Promise<void> {
  void _formData;
  await changeResponseStatus(responseId, placeId, status);
}
