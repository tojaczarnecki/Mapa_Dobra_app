import "dotenv/config";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
const pool = new pg.Pool({ connectionString });
const expiredSession = randomUUID();
const activeSession = randomUUID();
const expiredToken = randomUUID();
const activeToken = randomUUID();

try {
  const admin = await pool.query<{ id: string }>(`SELECT "id" FROM "admin_users" ORDER BY "createdAt" LIMIT 1`);
  if (!admin.rows[0]) throw new Error("No administrator exists for housekeeping test.");
  const adminId = admin.rows[0].id;
  const hash = () => randomBytes(32).toString("hex");
  await pool.query(
    `INSERT INTO "admin_sessions" ("id", "adminUserId", "tokenHash", "expiresAt") VALUES
      ($1, $3, $4, NOW() - INTERVAL '2 days'),
      ($2, $3, $5, NOW() + INTERVAL '1 hour')`,
    [expiredSession, activeSession, adminId, hash(), hash()],
  );
  await pool.query(
    `INSERT INTO "admin_access_tokens" ("id", "adminUserId", "purpose", "tokenHash", "expiresAt", "usedAt") VALUES
      ($1, $3, 'INVITATION'::"AdminTokenPurpose", $4, NOW() - INTERVAL '2 days', NOW() - INTERVAL '8 days'),
      ($2, $3, 'INVITATION'::"AdminTokenPurpose", $5, NOW() + INTERVAL '1 day', NULL)`,
    [expiredToken, activeToken, adminId, hash(), hash()],
  );

  execFileSync("npm", ["run", "db:housekeeping"], { stdio: "inherit" });
  const remaining = await pool.query<{ sessions: number; tokens: number }>(
    `SELECT
      (SELECT COUNT(*)::int FROM "admin_sessions" WHERE "id" IN ($1, $2)) AS sessions,
      (SELECT COUNT(*)::int FROM "admin_access_tokens" WHERE "id" IN ($3, $4)) AS tokens`,
    [expiredSession, activeSession, expiredToken, activeToken],
  );
  if (remaining.rows[0].sessions !== 1 || remaining.rows[0].tokens !== 1) throw new Error("Housekeeping test did not preserve exactly the active records.");
  await pool.query(`DELETE FROM "admin_sessions" WHERE "id" = $1`, [activeSession]);
  await pool.query(`DELETE FROM "admin_access_tokens" WHERE "id" = $1`, [activeToken]);
  console.info("Housekeeping test passed: expired records removed, active records preserved, test records cleaned up.");
} finally {
  await pool.end();
}
