"use server";

import { Prisma } from "@/generated/prisma/client";
import { hashPassword, isAcceptableAdminPassword } from "@/lib/admin/password";
import { hashAccessToken, isUsableAccessToken } from "@/lib/admin/access-tokens";
import { prisma } from "@/lib/prisma";

export type AccountTokenActionState = { error?: string; success?: string };

export async function completeAccountToken(
  token: string,
  purpose: "INVITATION" | "PASSWORD_RESET",
  _state: AccountTokenActionState,
  formData: FormData,
): Promise<AccountTokenActionState> {
  if (!/^[A-Za-z0-9_-]{40,100}$/u.test(token)) return { error: "Ten link jest nieprawidłowy lub wygasł." };
  const password = formData.get("password");
  const confirmation = formData.get("passwordConfirmation");
  if (typeof password !== "string" || typeof confirmation !== "string" || !isAcceptableAdminPassword(password)) {
    return { error: "Hasło musi mieć od 12 do 200 znaków." };
  }
  if (password !== confirmation) return { error: "Hasła nie są takie same." };

  const tokenHash = hashAccessToken(token);
  try {
    await prisma.$transaction(async (transaction) => {
      const accessToken = await transaction.adminAccessToken.findUnique({
        where: { tokenHash },
        include: { adminUser: { select: { id: true, active: true } } },
      });
      if (!accessToken || accessToken.purpose !== purpose || !isUsableAccessToken(accessToken)) throw new Error("TOKEN");
      const now = new Date();
      await transaction.adminUser.update({
        where: { id: accessToken.adminUserId },
        data: { passwordHash: await hashPassword(password), active: true },
      });
      await transaction.adminSession.deleteMany({ where: { adminUserId: accessToken.adminUserId } });
      await transaction.adminAccessToken.updateMany({
        where: { adminUserId: accessToken.adminUserId, purpose, usedAt: null },
        data: { usedAt: now },
      });
      await transaction.auditLog.create({ data: {
        adminUserId: accessToken.adminUserId,
        action: purpose === "INVITATION" ? "USER_ACTIVATED" : "PASSWORD_RESET_COMPLETED",
        entityType: "ADMIN_USER",
        entityId: accessToken.adminUserId,
        changedFields: purpose === "INVITATION" ? ["active", "password"] : ["password", "sessions"],
        previousValues: Prisma.JsonNull,
        newValues: { active: true },
        note: purpose === "INVITATION" ? "Użytkownik aktywował konto." : "Użytkownik ustawił nowe hasło; wcześniejsze sesje unieważniono.",
      } });
    });
    return { success: purpose === "INVITATION" ? "Konto zostało aktywowane. Możesz się zalogować." : "Hasło zostało zmienione. Możesz się zalogować." };
  } catch {
    return { error: purpose === "INVITATION" ? "Zaproszenie wygasło. Skontaktuj się z administratorem Mapy Dobra." : "Link resetu hasła jest nieprawidłowy lub wygasł." };
  }
}

