// Applies supabase/schema.sql to the live Postgres via the Supavisor pooler.
// Probes regions until one connects. Password comes from DUDE_DB_PASS (never printed).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ref = "xnqzrfjddaelcsxwskxw";
const password = process.env.DUDE_DB_PASS;
if (!password) {
  console.error("Missing DUDE_DB_PASS env var. Run: source ~/.zshrc");
  process.exit(1);
}

// us-east-2 / aws-1 is this project's pooler; keep others as fallback.
const regions = [
  "us-east-2", "us-east-1", "us-west-1", "us-west-2",
  "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
  "ap-south-1", "ca-central-1", "sa-east-1",
];
const prefixes = ["aws-1", "aws-0"];

// Try session pooler (5432) first for DDL, then transaction pooler (6543).
const candidates = [];
for (const port of [5432, 6543]) {
  for (const prefix of prefixes) {
    for (const region of regions) {
      candidates.push({
        label: `${prefix}-${region}:${port}`,
        host: `${prefix}-${region}.pooler.supabase.com`,
        port,
        user: `postgres.${ref}`,
        database: "postgres",
        password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      });
    }
  }
}

async function tryConnect(cfg) {
  const client = new pg.Client(cfg);
  try {
    await client.connect();
    return client;
  } catch (err) {
    await client.end().catch(() => {});
    throw err;
  }
}

const sql = readFileSync(join(__dirname, "..", "supabase", "schema.sql"), "utf8");

let client = null;
let used = null;
for (const cfg of candidates) {
  try {
    client = await tryConnect(cfg);
    used = cfg.label;
    break;
  } catch (err) {
    const code = err.code || err.message?.split("\n")[0] || "unknown";
    // "Tenant or user not found" = wrong region; keep probing quietly.
    process.stdout.write(`  ${cfg.label}: ${code}\n`);
  }
}

if (!client) {
  console.error("\nCould not connect via any pooler region. Blocked.");
  process.exit(2);
}

console.log(`\nConnected via pooler ${used}. Applying schema...`);
try {
  await client.query(sql);
  console.log("Schema applied.");
  const { rows } = await client.query(
    "select name from members order by selection_order;",
  );
  console.log("Members seeded:");
  for (const r of rows) console.log("  -", r.name);
  console.log(`POOLER_REGION=${used}`);
} catch (err) {
  console.error("Schema apply failed:", err.message);
  process.exitCode = 3;
} finally {
  await client.end().catch(() => {});
}
