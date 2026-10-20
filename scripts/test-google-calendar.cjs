// Run against an isolated schema in the local database; Google requests are mocked.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { randomUUID, generateKeyPairSync } = require("node:crypto");
const os = require("node:os");
const { after } = require("node:test");
const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const ts = require("typescript");
require("dotenv").config({ quiet: true });

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Calendar tests require a local PostgreSQL database.");
  const schema = `doen_calendar_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: url.toString() });
  const pool = new Pool({ connectionString: url.toString(), options: `-c search_path=${schema}` });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const credentialsFile = path.join(os.tmpdir(), `${schema}.json`);
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  fs.writeFileSync(credentialsFile, JSON.stringify({ type: "service_account", client_email: "fixture@example.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
  }), { mode: 0o600 });
  after(async () => {
    fs.unlinkSync(credentialsFile);
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  const root = path.join(__dirname, "..");
  const journal = JSON.parse(fs.readFileSync(path.join(root, "drizzle/migrations/meta/_journal.json"), "utf8"));
  for (const { tag } of journal.entries) {
    const migration = fs.readFileSync(path.join(root, `drizzle/migrations/${tag}.sql`), "utf8");
    await pool.query(migration.replaceAll('"public".', `"${schema}".`));
  }
  const db = drizzle(pool);
  require.extensions[".ts"] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    module._compile(outputText, filename);
  };
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (name, ...args) {
    return resolve.call(this, name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : name, ...args);
  };
  const load = Module._load;
  globalThis.fetch = async () => { throw new Error("Unexpected external request in calendar tests."); };
  Module._load = function (name, ...args) {
    if (name === "@/lib/db") return { db };
    if (name === "@/env") return { env: { GOOGLE_SERVICE_ACCOUNT_FILE: credentialsFile, GOOGLE_CALENDAR_ID: "test-calendar" } };
    if (name === "next/server") return { after: () => {} };
    return load.call(this, name, ...args);
  };
  require("../src/lib/event-recurrence.test.ts");
  require("../src/client/api/google-calendar.test.ts");
  require("../src/lib/google-calendar/plan.test.ts");
  require("../src/lib/google-calendar/service-account.test.ts");
  require("../src/lib/google-calendar/client.test.ts");
  require("../src/lib/google-calendar/sync.test.ts");
}
main().catch((error) => { console.error(error.message || error.code || "Calendar test setup failed."); process.exitCode = 1; });
