import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
const dryRun = process.argv.includes("--dry-run");
const graceDays = 7;
const pool = new pg.Pool({ connectionString });

try {
  const result = await pool.query(
    `SELECT
      (SELECT COUNT(*)::int FROM "admin_sessions" WHERE "expiresAt" <= NOW()) AS expired_sessions,
      (SELECT COUNT(*)::int FROM "admin_access_tokens" WHERE "expiresAt" <= NOW() - INTERVAL '${graceDays} days' OR "usedAt" <= NOW() - INTERVAL '${graceDays} days') AS stale_tokens`,
  );
  const counts = result.rows[0] as { expired_sessions: number; stale_tokens: number };
  if (!dryRun) {
    await pool.query("BEGIN");
    await pool.query(`DELETE FROM "admin_sessions" WHERE "expiresAt" <= NOW()`);
    await pool.query(`DELETE FROM "admin_access_tokens" WHERE "expiresAt" <= NOW() - INTERVAL '${graceDays} days' OR "usedAt" <= NOW() - INTERVAL '${graceDays} days'`);
    await pool.query("COMMIT");
  }
  console.info(JSON.stringify({ dryRun, graceDays, deleted: dryRun ? { sessions: 0, tokens: 0 } : { sessions: counts.expired_sessions, tokens: counts.stale_tokens }, eligible: { sessions: counts.expired_sessions, tokens: counts.stale_tokens } }));
} catch (error) {
  await pool.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await pool.end();
}

