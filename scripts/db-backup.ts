import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const outputDirectory = path.resolve("backups");
mkdirSync(outputDirectory, { recursive: true });
const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
let output = path.join(outputDirectory, `mapa_dobra_${timestamp}.dump`);
let suffix = 1;
while (statSync(output, { throwIfNoEntry: false })) output = path.join(outputDirectory, `mapa_dobra_${timestamp}_${suffix++}.dump`);

const databaseUrl = new URL(connectionString);
databaseUrl.search = "";
execFileSync("pg_dump", ["--format=custom", "--file", output, databaseUrl.toString()], { stdio: "inherit" });
execFileSync("pg_restore", ["--list", output], { stdio: ["ignore", "ignore", "inherit"] });
const size = statSync(output).size;
console.info(`Backup ready: ${output} (${size} bytes)`);

