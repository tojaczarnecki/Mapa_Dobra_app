import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
const pool = new pg.Pool({ connectionString });

try {
  const found = await pool.query<{ id: string }>(`SELECT "id" FROM "accommodation_capacity_groups" LIMIT 1`);
  if (!found.rows[0]) {
    console.info("No capacity group exists; constraint test skipped.");
  } else {
    const id = found.rows[0].id;
    const cases = [
      ["negative total", `UPDATE "accommodation_capacity_groups" SET "totalBeds" = -1 WHERE "id" = $1`],
      ["negative available", `UPDATE "accommodation_capacity_groups" SET "availableBeds" = -1 WHERE "id" = $1`],
      ["available above total", `UPDATE "accommodation_capacity_groups" SET "totalBeds" = 1, "availableBeds" = 2 WHERE "id" = $1`],
    ] as const;
    for (const [label, statement] of cases) {
      await pool.query("BEGIN");
      try {
        await pool.query(statement, [id]);
        throw new Error(`${label} was accepted unexpectedly`);
      } catch (error) {
        if (error instanceof Error && error.message.endsWith("was accepted unexpectedly")) throw error;
        console.info(`${label}: rejected`);
      } finally {
        await pool.query("ROLLBACK");
      }
    }
    await pool.query("BEGIN");
    await pool.query(`UPDATE "accommodation_capacity_groups" SET "totalBeds" = NULL, "availableBeds" = NULL WHERE "id" = $1`, [id]);
    await pool.query("ROLLBACK");
    console.info("unknown/null capacity: accepted");
  }
} finally {
  await pool.end();
}

