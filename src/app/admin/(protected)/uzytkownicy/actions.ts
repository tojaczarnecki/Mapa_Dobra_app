"use server";

import { Prisma } from "@/generated/prisma/client";
import type { AdminPermission, AdminRole } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import {
  accessTokenExpiry,
  createAccessToken,
  hashAccessToken,
} from "@/lib/admin/access-tokens";
import {
  allAdminPermissions,
  placeScopedPermissions,
  resolveEffectivePermissions,
} from "@/lib/admin/permissions";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export type UserActionState = {
  error?: string;
  success?: string;
  userId?: string;
  accessPath?: string;
};

const roles: AdminRole[] = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "PLACE_MANAGER", "VIEWER"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

type SubmittedAccess = { placeId: string; permissions: AdminPermission[] };

function text(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max + 1);
}

function parsePermissionList(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length > 20_000) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length > allAdminPermissions.length) return null;
    const unique = [...new Set(parsed)];
    return unique.every((item): item is AdminPermission =>
      typeof item === "string" && allAdminPermissions.includes(item as AdminPermission),
    ) ? unique : null;
  } catch {
    return null;
  }
}

function parsePlaceAccess(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length > 100_000) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length > 200) return null;
    const access: SubmittedAccess[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object" || !("placeId" in item) || !("permissions" in item)) return null;
      if (typeof item.placeId !== "string" || !uuidPattern.test(item.placeId) || !Array.isArray(item.permissions)) return null;
      const permissions = [...new Set(item.permissions)];
      if (!permissions.every((permission): permission is AdminPermission =>
        typeof permission === "string" && placeScopedPermissions.includes(permission as AdminPermission),
      )) return null;
      access.push({ placeId: item.placeId, permissions });
    }
    if (new Set(access.map((item) => item.placeId)).size !== access.length) return null;
    return access;
  } catch {
    return null;
  }
}

function input(formData: FormData) {
  const displayName = text(formData, "displayName", 160);
  const email = text(formData, "email", 320).toLocaleLowerCase("pl-PL");
  const role = text(formData, "role", 40) as AdminRole;
  const allow = parsePermissionList(formData.get("allowPermissions"));
  const deny = parsePermissionList(formData.get("denyPermissions"));
  const placeAccess = parsePlaceAccess(formData.get("placeAccess"));
  if (!displayName || displayName.length > 160 || !emailPattern.test(email) || !roles.includes(role) || !allow || !deny || !placeAccess) return null;
  if (allow.some((permission) => deny.includes(permission))) return null;
  return { displayName, email, role, allow, deny, placeAccess };
}

async function ensurePlacesExist(transaction: Prisma.TransactionClient, access: SubmittedAccess[]) {
  if (!access.length) return;
  const count = await transaction.place.count({ where: { id: { in: access.map((item) => item.placeId) } } });
  if (count !== access.length) throw new Error("PLACE_NOT_FOUND");
}

async function issueToken(
  transaction: Prisma.TransactionClient,
  adminUserId: string,
  purpose: "INVITATION" | "PASSWORD_RESET",
  createdByAdminId: string,
) {
  const token = createAccessToken();
  const now = new Date();
  await transaction.adminAccessToken.updateMany({
    where: { adminUserId, purpose, usedAt: null },
    data: { usedAt: now },
  });
  await transaction.adminAccessToken.create({
    data: {
      adminUserId,
      purpose,
      tokenHash: hashAccessToken(token),
      expiresAt: accessTokenExpiry(purpose, now),
      createdByAdminId,
    },
  });
  return token;
}

function tokenPath(purpose: "INVITATION" | "PASSWORD_RESET", token: string) {
  return purpose === "INVITATION" ? `/admin/aktywacja/${token}` : `/admin/reset-hasla/${token}`;
}

export async function createAdminUser(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const session = await requirePermission("MANAGE_USERS");
  const payload = input(formData);
  if (!payload) return { error: "Sprawdź dane konta, uprawnienia i przypisane placówki." };
  if ((payload.allow.length || payload.deny.length || payload.role === "SUPER_ADMIN") && !session.user.permissions.includes("MANAGE_USER_PERMISSIONS")) {
    return { error: "Nie masz uprawnienia do nadawania tych praw." };
  }
  if (payload.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") return { error: "Tylko superadministrator może utworzyć inne konto SUPER_ADMIN." };

  try {
    const result = await prisma.$transaction(async (transaction) => {
      await ensurePlacesExist(transaction, payload.placeAccess);
      const user = await transaction.adminUser.create({
        data: {
          displayName: payload.displayName,
          email: payload.email,
          role: payload.role,
          active: false,
          passwordHash: null,
          ...(payload.allow.length || payload.deny.length ? { permissionOverrides: {
            create: [
              ...payload.allow.map((permission) => ({ permission, effect: "ALLOW" as const })),
              ...payload.deny.map((permission) => ({ permission, effect: "DENY" as const })),
            ],
          } } : {}),
          ...(payload.placeAccess.length ? { placeAccesses: {
            create: payload.placeAccess.map((access) => ({
              placeId: access.placeId,
              permissions: access.permissions,
              createdByAdminId: session.user.id,
            })),
          } } : {}),
        },
      });
      const token = await issueToken(transaction, user.id, "INVITATION", session.user.id);
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "USER_INVITED",
          entityType: "ADMIN_USER",
          entityId: user.id,
          changedFields: ["email", "displayName", "role", "permissions", "placeAccess"],
          newValues: {
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            allow: payload.allow,
            deny: payload.deny,
            placeIds: payload.placeAccess.map((access) => access.placeId),
          },
          changeOrigin: "ADMIN_MANUAL",
          note: "Utworzono konto oczekujące na aktywację. Token nie został zapisany w AuditLog.",
        },
      });
      if (payload.placeAccess.length) {
        const createdAccesses = await transaction.userPlaceAccess.findMany({ where: { adminUserId: user.id, active: true } });
        await transaction.auditLog.createMany({ data: createdAccesses.map((access) => ({ adminUserId: session.user.id, action: "USER_PLACE_ACCESS_GRANTED" as const, entityType: "USER_PLACE_ACCESS" as const, entityId: access.id, changedFields: ["active", "permissions"], newValues: { userId: user.id, placeId: access.placeId, permissions: access.permissions }, changeOrigin: "ADMIN_MANUAL" as const })) });
      }
      return { user, token };
    });
    revalidatePath("/admin/uzytkownicy");
    return {
      success: "Użytkownik został utworzony. Przekaż mu jednorazowy link aktywacyjny.",
      userId: result.user.id,
      accessPath: tokenPath("INVITATION", result.token),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Konto z tym adresem e-mail już istnieje." };
    return { error: "Nie udało się utworzyć użytkownika." };
  }
}

export async function updateAdminUser(
  userId: string,
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const session = await requirePermission("MANAGE_USERS");
  if (!uuidPattern.test(userId)) return { error: "Nieprawidłowy użytkownik." };
  const payload = input(formData);
  if (!payload) return { error: "Sprawdź dane konta, uprawnienia i przypisane placówki." };
  if (!session.user.permissions.includes("MANAGE_USER_PERMISSIONS")) return { error: "Nie masz uprawnienia do zmiany ról i uprawnień." };
  if (payload.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return { error: "Tylko superadministrator może nadać rolę SUPER_ADMIN." };
  }

  const nextEffective = resolveEffectivePermissions(payload.role, [
    ...payload.allow.map((permission) => ({ permission, effect: "ALLOW" as const })),
    ...payload.deny.map((permission) => ({ permission, effect: "DENY" as const })),
  ]);
  if (session.user.id === userId && (!nextEffective.includes("MANAGE_USERS") || !nextEffective.includes("MANAGE_USER_PERMISSIONS"))) {
    return { error: "Nie możesz odebrać sobie uprawnień potrzebnych do zarządzania użytkownikami." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.adminUser.findUnique({
        where: { id: userId },
        include: { permissionOverrides: true, placeAccesses: true },
      });
      if (!current) throw new Error("NOT_FOUND");
      if (current.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") throw new Error("SUPER_ADMIN_PROTECTED");
      const keepsCriticalAccess = payload.role === "SUPER_ADMIN"
        && nextEffective.includes("MANAGE_USERS")
        && nextEffective.includes("MANAGE_USER_PERMISSIONS");
      if (current.role === "SUPER_ADMIN" && current.active && !keepsCriticalAccess) {
        const others = await transaction.adminUser.count({
          where: {
            role: "SUPER_ADMIN",
            active: true,
            id: { not: userId },
            permissionOverrides: {
              none: {
                effect: "DENY",
                permission: { in: ["MANAGE_USERS", "MANAGE_USER_PERMISSIONS"] },
              },
            },
          },
        });
        if (others === 0) throw new Error("LAST_SUPER_ADMIN");
      }
      await ensurePlacesExist(transaction, payload.placeAccess);
      await transaction.adminUser.update({ where: { id: userId }, data: { displayName: payload.displayName, email: payload.email, role: payload.role } });
      await transaction.adminUserPermission.deleteMany({ where: { adminUserId: userId } });
      const overrideRows = [
        ...payload.allow.map((permission) => ({ adminUserId: userId, permission, effect: "ALLOW" as const })),
        ...payload.deny.map((permission) => ({ adminUserId: userId, permission, effect: "DENY" as const })),
      ];
      if (overrideRows.length) await transaction.adminUserPermission.createMany({ data: overrideRows });
      const selectedIds = payload.placeAccess.map((access) => access.placeId);
      await transaction.userPlaceAccess.updateMany({ where: { adminUserId: userId, placeId: { notIn: selectedIds } }, data: { active: false } });
      const priorActiveIds = new Set(current.placeAccesses.filter((item) => item.active).map((item) => item.placeId));
      const savedAccesses = [];
      for (const access of payload.placeAccess) {
        const savedAccess = await transaction.userPlaceAccess.upsert({
          where: { adminUserId_placeId: { adminUserId: userId, placeId: access.placeId } },
          create: { adminUserId: userId, placeId: access.placeId, permissions: access.permissions, active: true, createdByAdminId: session.user.id },
          update: { permissions: access.permissions, active: true, createdByAdminId: session.user.id },
        });
        savedAccesses.push(savedAccess);
      }
      const roleChanged = current.role !== payload.role;
      await transaction.auditLog.create({ data: {
        adminUserId: session.user.id,
        action: roleChanged ? "USER_ROLE_CHANGED" : "USER_PERMISSIONS_CHANGED",
        entityType: "ADMIN_USER",
        entityId: userId,
        changedFields: ["displayName", "email", "role", "permissions", "placeAccess"],
        previousValues: { displayName: current.displayName, email: current.email, role: current.role, overrides: current.permissionOverrides, placeIds: current.placeAccesses.filter((item) => item.active).map((item) => item.placeId) },
        newValues: { displayName: payload.displayName, email: payload.email, role: payload.role, allow: payload.allow, deny: payload.deny, placeIds: selectedIds },
        changeOrigin: "ADMIN_MANUAL",
      } });
      const nextIds = new Set(selectedIds);
      for (const savedAccess of savedAccesses.filter((item) => !priorActiveIds.has(item.placeId))) {
        await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: "USER_PLACE_ACCESS_GRANTED", entityType: "USER_PLACE_ACCESS", entityId: savedAccess.id, changedFields: ["active", "permissions"], previousValues: Prisma.JsonNull, newValues: { userId, placeId: savedAccess.placeId, permissions: savedAccess.permissions }, changeOrigin: "ADMIN_MANUAL" } });
      }
      for (const revoked of current.placeAccesses.filter((item) => item.active && !nextIds.has(item.placeId))) {
        await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: "USER_PLACE_ACCESS_REVOKED", entityType: "USER_PLACE_ACCESS", entityId: revoked.id, changedFields: ["active"], previousValues: { active: true, permissions: revoked.permissions }, newValues: { active: false }, changeOrigin: "ADMIN_MANUAL" } });
      }
    });
    revalidatePath("/admin/uzytkownicy");
    revalidatePath(`/admin/uzytkownicy/${userId}`);
    return { success: "Dane użytkownika i jego uprawnienia zostały zapisane.", userId };
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_SUPER_ADMIN") return { error: "System musi zachować co najmniej jednego aktywnego superadministratora." };
    if (error instanceof Error && error.message === "SUPER_ADMIN_PROTECTED") return { error: "Tylko superadministrator może zmieniać konto SUPER_ADMIN." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Konto z tym adresem e-mail już istnieje." };
    return { error: "Nie udało się zapisać użytkownika." };
  }
}

export async function setAdminUserActive(userId: string, active: boolean): Promise<UserActionState> {
  const session = await requirePermission("MANAGE_USERS");
  if (!uuidPattern.test(userId)) return { error: "Nieprawidłowy użytkownik." };
  if (!active && userId === session.user.id) return { error: "Nie możesz zdezaktywować własnego konta." };
  try {
    await prisma.$transaction(async (transaction) => {
      const user = await transaction.adminUser.findUniqueOrThrow({ where: { id: userId } });
      if (user.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") throw new Error("SUPER_ADMIN_PROTECTED");
      if (!active && user.role === "SUPER_ADMIN" && user.active) {
        const others = await transaction.adminUser.count({ where: { role: "SUPER_ADMIN", active: true, id: { not: userId } } });
        if (!others) throw new Error("LAST_SUPER_ADMIN");
      }
      await transaction.adminUser.update({ where: { id: userId }, data: { active } });
      if (!active) await transaction.adminSession.deleteMany({ where: { adminUserId: userId } });
      if (!active) await transaction.adminAccessToken.updateMany({ where: { adminUserId: userId, usedAt: null }, data: { usedAt: new Date() } });
      await transaction.auditLog.create({ data: {
        adminUserId: session.user.id,
        action: active ? "USER_REACTIVATED" : "USER_DEACTIVATED",
        entityType: "ADMIN_USER",
        entityId: userId,
        changedFields: ["active"],
        previousValues: { active: user.active },
        newValues: { active },
        changeOrigin: "ADMIN_MANUAL",
        note: active ? "Konto reaktywowano. Poprzednie sesje pozostają unieważnione." : "Konto zdezaktywowano i unieważniono wszystkie sesje.",
      } });
    });
    revalidatePath("/admin/uzytkownicy");
    revalidatePath(`/admin/uzytkownicy/${userId}`);
    return { success: active ? "Konto zostało reaktywowane." : "Konto zostało zdezaktywowane, a sesje unieważnione." };
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_SUPER_ADMIN") return { error: "Nie można zdezaktywować ostatniego aktywnego superadministratora." };
    if (error instanceof Error && error.message === "SUPER_ADMIN_PROTECTED") return { error: "Tylko superadministrator może zmienić stan konta SUPER_ADMIN." };
    return { error: "Nie udało się zmienić stanu konta." };
  }
}

export async function revokeAdminUserSessions(userId: string): Promise<UserActionState> {
  const session = await requirePermission("MANAGE_USERS");
  if (!uuidPattern.test(userId)) return { error: "Nieprawidłowy użytkownik." };
  const target = await prisma.adminUser.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return { error: "Nie znaleziono użytkownika." };
  if (target.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") return { error: "Tylko superadministrator może zarządzać sesjami SUPER_ADMIN." };
  const deleted = await prisma.$transaction(async (transaction) => {
    const result = await transaction.adminSession.deleteMany({ where: { adminUserId: userId } });
    await transaction.auditLog.create({ data: {
      adminUserId: session.user.id,
      action: "USER_SESSIONS_REVOKED",
      entityType: "ADMIN_USER",
      entityId: userId,
      changedFields: ["sessions"],
      previousValues: { activeSessions: result.count },
      newValues: { activeSessions: 0 },
      changeOrigin: "ADMIN_MANUAL",
    } });
    return result.count;
  });
  return { success: `Unieważniono aktywne sesje: ${deleted}.` };
}

export async function createAdminUserAccessLink(
  userId: string,
  purpose: "INVITATION" | "PASSWORD_RESET",
): Promise<UserActionState> {
  const session = await requirePermission("MANAGE_USERS");
  if (!uuidPattern.test(userId)) return { error: "Nieprawidłowy użytkownik." };
  try {
    const token = await prisma.$transaction(async (transaction) => {
      const user = await transaction.adminUser.findUniqueOrThrow({ where: { id: userId }, select: { id: true, role: true } });
      if (user.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") throw new Error("SUPER_ADMIN_PROTECTED");
      const value = await issueToken(transaction, user.id, purpose, session.user.id);
      await transaction.auditLog.create({ data: {
        adminUserId: session.user.id,
        action: purpose === "INVITATION" ? "USER_INVITED" : "PASSWORD_RESET_CREATED",
        entityType: "ADMIN_USER",
        entityId: user.id,
        changedFields: [purpose === "INVITATION" ? "invitation" : "passwordReset"],
        changeOrigin: "ADMIN_MANUAL",
        note: "Wygenerowano jednorazowy link. Token nie został zapisany w AuditLog.",
      } });
      return value;
    });
    return { success: purpose === "INVITATION" ? "Wygenerowano nowe zaproszenie." : "Wygenerowano link resetu hasła.", accessPath: tokenPath(purpose, token) };
  } catch {
    return { error: "Nie udało się wygenerować linku." };
  }
}
