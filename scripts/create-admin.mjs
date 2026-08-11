import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import {
  hashPassword,
  isAcceptableAdminPassword,
} from "../src/lib/admin/password.ts";

const connectionString = process.env.DATABASE_URL;
const email = process.env.ADMIN_SEED_EMAIL?.trim().toLocaleLowerCase("pl-PL");
const password = process.env.ADMIN_SEED_PASSWORD ?? "";
const displayName = process.env.ADMIN_SEED_DISPLAY_NAME?.trim();

if (!connectionString || !email || !displayName || !isAcceptableAdminPassword(password)) {
  throw new Error(
    "Set DATABASE_URL, ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD (min. 12 characters) and ADMIN_SEED_DISPLAY_NAME.",
  );
}

const pool = new pg.Pool({ connectionString });

try {
  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    `INSERT INTO "admin_users"
      ("id", "email", "passwordHash", "displayName", "role", "active", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'SUPER_ADMIN'::"AdminRole", TRUE, NOW(), NOW())
     ON CONFLICT ("email") DO UPDATE SET
       "passwordHash" = EXCLUDED."passwordHash",
       "displayName" = EXCLUDED."displayName",
       "role" = EXCLUDED."role",
       "active" = TRUE,
       "updatedAt" = NOW()
     RETURNING "id", "email", "displayName", "role"`,
    [randomUUID(), email, passwordHash, displayName],
  );
  const admin = result.rows[0];

  console.info(`Administrator ready: ${admin.email} (${admin.role})`);
} finally {
  await pool.end();
}
