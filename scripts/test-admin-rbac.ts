import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { accessTokenExpiry, createAccessToken, hashAccessToken, isUsableAccessToken } from "../src/lib/admin/access-tokens.ts";
import { hashPassword, verifyPassword } from "../src/lib/admin/password.ts";
import { placeManagerDefaultPermissions, resolveEffectivePermissions } from "../src/lib/admin/permissions.ts";
import { completeAccountToken } from "../src/app/admin/account-token-actions.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const mode = process.argv[2] ?? "setup";
const moderatorEmail = "test-moderator-g3@mapadobra.local";
const managerEmail = "test-place-manager-g3@mapadobra.local";
const tokenUserEmail = "test-token-user-g3@mapadobra.local";

async function deactivateTests() {
  const ids = (await prisma.adminUser.findMany({ where: { email: { in: [moderatorEmail, managerEmail, tokenUserEmail] } }, select: { id: true } })).map((user) => user.id);
  await prisma.$transaction([
    prisma.adminSession.deleteMany({ where: { adminUserId: { in: ids } } }),
    prisma.adminUser.updateMany({ where: { id: { in: ids } }, data: { active: false } }),
  ]);
  console.log(JSON.stringify({ mode: "deactivate", inactiveUsers: ids.length }));
}

async function setup() {
  const superAdmin = await prisma.adminUser.findUniqueOrThrow({ where: { email: "admin@mapadobra.local" } });
  assert.equal(superAdmin.role, "SUPER_ADMIN");
  assert.equal(superAdmin.active, true);
  const testPlaces = await prisma.place.findMany({ where: { recordKind: "TEST" }, orderBy: [{ accommodation: { id: "asc" } }, { name: "asc" }], take: 3, select: { id: true, name: true, accommodation: { select: { id: true, capacityGroups: { where: { active: true }, take: 1 } } } } });
  assert.equal(testPlaces.length, 3, "Three TEST places are required");
  const accommodationPlace = testPlaces.find((place) => place.accommodation?.capacityGroups.length);
  assert.ok(accommodationPlace, "A TEST accommodation with a capacity group is required");

  const moderatorPassword = `Md-${randomBytes(18).toString("base64url")}!`;
  const managerPassword = `Md-${randomBytes(18).toString("base64url")}!`;
  const moderator = await prisma.adminUser.upsert({ where: { email: moderatorEmail }, update: { displayName: "TEST Moderator Etap G.3", role: "MODERATOR", active: true, passwordHash: await hashPassword(moderatorPassword) }, create: { email: moderatorEmail, displayName: "TEST Moderator Etap G.3", role: "MODERATOR", active: true, passwordHash: await hashPassword(moderatorPassword) } });
  const manager = await prisma.adminUser.upsert({ where: { email: managerEmail }, update: { displayName: "TEST Place Manager Etap G.3", role: "PLACE_MANAGER", active: true, passwordHash: await hashPassword(managerPassword) }, create: { email: managerEmail, displayName: "TEST Place Manager Etap G.3", role: "PLACE_MANAGER", active: true, passwordHash: await hashPassword(managerPassword) } });
  assert.equal(await verifyPassword(moderatorPassword, moderator.passwordHash!), true);
  assert.equal(await verifyPassword(managerPassword, manager.passwordHash!), true);

  await prisma.adminUserPermission.deleteMany({ where: { adminUserId: { in: [moderator.id, manager.id] } } });
  assert.equal(resolveEffectivePermissions("MODERATOR").includes("PUBLISH_PLACES"), false);
  await prisma.adminUserPermission.create({ data: { adminUserId: moderator.id, permission: "PUBLISH_PLACES", effect: "ALLOW" } });
  const moderatorOverride = await prisma.adminUserPermission.findMany({ where: { adminUserId: moderator.id } });
  assert.equal(resolveEffectivePermissions("MODERATOR", moderatorOverride).includes("PUBLISH_PLACES"), true);
  await prisma.adminUserPermission.deleteMany({ where: { adminUserId: moderator.id, permission: "PUBLISH_PLACES" } });
  assert.equal(resolveEffectivePermissions("MODERATOR").includes("PUBLISH_PLACES"), false);

  await prisma.userPlaceAccess.updateMany({ where: { adminUserId: manager.id }, data: { active: false } });
  for (const place of testPlaces.slice(0, 2)) {
    await prisma.userPlaceAccess.upsert({ where: { adminUserId_placeId: { adminUserId: manager.id, placeId: place.id } }, update: { active: true, permissions: placeManagerDefaultPermissions, createdByAdminId: superAdmin.id }, create: { adminUserId: manager.id, placeId: place.id, permissions: placeManagerDefaultPermissions, createdByAdminId: superAdmin.id } });
  }
  const visibleIds = (await prisma.userPlaceAccess.findMany({ where: { adminUserId: manager.id, active: true }, select: { placeId: true } })).map((item) => item.placeId).sort();
  assert.deepEqual(visibleIds, testPlaces.slice(0, 2).map((place) => place.id).sort());
  assert.equal(visibleIds.includes(testPlaces[2].id), false);

  const invitee = await prisma.adminUser.upsert({ where: { email: tokenUserEmail }, update: { displayName: "TEST Token User Etap G.3", role: "VIEWER", active: false, passwordHash: null }, create: { email: tokenUserEmail, displayName: "TEST Token User Etap G.3", role: "VIEWER", active: false, passwordHash: null } });
  const invitation = createAccessToken();
  const invitationRecord = await prisma.adminAccessToken.create({ data: { adminUserId: invitee.id, purpose: "INVITATION", tokenHash: hashAccessToken(invitation), expiresAt: accessTokenExpiry("INVITATION"), createdByAdminId: superAdmin.id } });
  assert.notEqual(invitationRecord.tokenHash, invitation);
  assert.equal(isUsableAccessToken(invitationRecord), true);
  const activationPassword = `Md-${randomBytes(18).toString("base64url")}!`;
  const activationForm = new FormData();
  activationForm.set("password", activationPassword);
  activationForm.set("passwordConfirmation", activationPassword);
  const activationResult = await completeAccountToken(invitation, "INVITATION", {}, activationForm);
  assert.ok(activationResult.success);
  const reusedInvitation = await completeAccountToken(invitation, "INVITATION", {}, activationForm);
  assert.ok(reusedInvitation.error);
  const consumedInvitation = await prisma.adminAccessToken.findUniqueOrThrow({ where: { id: invitationRecord.id } });
  assert.equal(isUsableAccessToken(consumedInvitation), false);
  const expiredToken = await prisma.adminAccessToken.create({ data: { adminUserId: invitee.id, purpose: "INVITATION", tokenHash: hashAccessToken(createAccessToken()), expiresAt: new Date(Date.now() - 1000), createdByAdminId: superAdmin.id } });
  assert.equal(isUsableAccessToken(expiredToken), false);

  const resetToken = createAccessToken();
  await prisma.adminAccessToken.create({ data: { adminUserId: invitee.id, purpose: "PASSWORD_RESET", tokenHash: hashAccessToken(resetToken), expiresAt: accessTokenExpiry("PASSWORD_RESET"), createdByAdminId: superAdmin.id } });
  await prisma.adminSession.create({ data: { adminUserId: invitee.id, tokenHash: hashAccessToken(createAccessToken()), expiresAt: new Date(Date.now() + 60_000) } });
  const resetPassword = `Md-${randomBytes(18).toString("base64url")}!`;
  const resetForm = new FormData();
  resetForm.set("password", resetPassword);
  resetForm.set("passwordConfirmation", resetPassword);
  const resetResult = await completeAccountToken(resetToken, "PASSWORD_RESET", {}, resetForm);
  assert.ok(resetResult.success);
  assert.equal((await prisma.adminSession.count({ where: { adminUserId: invitee.id } })), 0);
  assert.ok((await completeAccountToken(resetToken, "PASSWORD_RESET", {}, resetForm)).error);
  const resetUser = await prisma.adminUser.findUniqueOrThrow({ where: { id: invitee.id } });
  assert.equal(await verifyPassword(resetPassword, resetUser.passwordHash!), true);

  const sessionToken = randomBytes(32).toString("base64url");
  await prisma.adminSession.create({ data: { adminUserId: manager.id, tokenHash: hashAccessToken(sessionToken), expiresAt: new Date(Date.now() + 60_000) } });
  assert.ok(await prisma.adminSession.count({ where: { adminUserId: manager.id } }));

  console.log(JSON.stringify({
    mode: "setup",
    moderator: { id: moderator.id, email: moderator.email, password: moderatorPassword },
    manager: { id: manager.id, email: manager.email, password: managerPassword },
    assignedPlaces: testPlaces.slice(0, 2).map((place) => ({ id: place.id, name: place.name })),
    deniedPlace: { id: testPlaces[2].id, name: testPlaces[2].name },
    accommodationPlaceId: accommodationPlace.id,
    tokenTests: { hashOnly: true, invitationActivated: true, invitationOneUse: true, expiredRejected: true, passwordResetOneUse: true, sessionsRevokedOnReset: true },
  }));
}

async function verify() {
  const [moderator, manager] = await Promise.all([
    prisma.adminUser.findUniqueOrThrow({ where: { email: moderatorEmail }, include: { permissionOverrides: true } }),
    prisma.adminUser.findUniqueOrThrow({ where: { email: managerEmail }, include: { placeAccesses: { where: { active: true } }, sessions: true } }),
  ]);
  assert.equal(moderator.role, "MODERATOR");
  assert.equal(resolveEffectivePermissions(moderator.role, moderator.permissionOverrides).includes("PUBLISH_PLACES"), false);
  assert.equal(manager.placeAccesses.length, 2);
  console.log(JSON.stringify({ mode: "verify", moderatorPublish: false, assignedPlaces: manager.placeAccesses.length, activeSessions: manager.sessions.length }));
}

try {
  if (mode === "deactivate") await deactivateTests();
  else if (mode === "verify") await verify();
  else await setup();
} finally {
  await prisma.$disconnect();
}
