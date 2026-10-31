// Exercise real routes and migrations in an isolated local PostgreSQL schema.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { randomUUID } = require("node:crypto");
const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const ts = require("typescript");
require("dotenv").config({ quiet: true });

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Requires a local database");
  const schema = `project_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: url.toString() });
  const pool = new Pool({ connectionString: url.toString(), options: `-c search_path=${schema}` });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const root = path.join(__dirname, "..");
    const journal = JSON.parse(fs.readFileSync(path.join(root, "drizzle/migrations/meta/_journal.json")));
    for (const { tag } of journal.entries) {
      await pool.query(fs.readFileSync(path.join(root, `drizzle/migrations/${tag}.sql`), "utf8")
        .replaceAll('"public".', `"${schema}".`));
    }
    const db = drizzle(pool);
    require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, filename);
    const resolve = Module._resolveFilename;
    Module._resolveFilename = function (name, ...args) {
      return resolve.call(this, name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : name, ...args);
    };
    const changes = [];
    const load = Module._load;
    Module._load = function (name, ...args) {
      if (name === "@/lib/db") return { db };
      if (name === "@/lib/google-calendar/sync") return { queueCalendarChanges: async (items) => changes.push(...items) };
      return load.call(this, name, ...args);
    };
    const { project, task } = require("../src/lib/db/schema/task.ts");
    const projects = require("../src/app/api/list/route.ts");
    const tasks = require("../src/app/api/tasks/route.ts");
    const [owner, other] = await db.insert(project).values([
      { name: "Delete me", color: "#69D571" }, { name: "Keep me", color: "#69D571" },
    ]).returning();
    const now = Date.now();
    const values = (title, offset, projectId, status = "idle") => ({ title, content: "", start: new Date(now + offset).toISOString(), duration: 30, projectId, status });
    const rows = await db.insert(task).values([
      values("expired idle", -7200000, owner.id), values("expired done", -10800000, owner.id, "done"),
      values("ongoing", -600000, owner.id), values("future", 3600000, owner.id),
      values("future done", 7200000, owner.id, "done"), values("unrelated", 3600000, other.id),
      values("no project", 7200000, null),
    ]).returning();
    const request = (method, body) => new Request("http://localhost/api/list", { method, body: JSON.stringify(body) });
    assert.equal((await projects.DELETE(request("DELETE", { id: owner.id }))).status, 200);
    const stored = await db.select().from(project);
    assert.equal(stored.length, 2);
    assert.equal(stored.find(({ id }) => id === owner.id).deleted, true);
    assert.deepEqual((await (await projects.GET()).json()).data.project.map(({ id }) => id), [other.id]);
    const remaining = await db.select().from(task);
    assert.deepEqual(remaining.map(({ title }) => title).sort(), ["expired done", "expired idle", "no project", "unrelated"]);
    assert.equal(remaining.find(({ title }) => title === "expired idle").projectId, owner.id);
    assert.deepEqual(changes.map(({ id }) => id).sort(), rows.slice(2, 5).map(({ id }) => id).sort());
    assert.equal((await projects.PATCH(request("PATCH", { id: owner.id, name: "Renamed" }))).status, 404);
    assert.equal((await projects.DELETE(request("DELETE", { id: owner.id }))).status, 404);
    assert.equal(changes.length, 3);
    const input = { ...values("Rejected", 0, owner.id), start: "2099-10-31T08:00:00Z", timeZone: "UTC" };
    assert.equal((await tasks.POST(request("POST", input))).status, 400);
    assert.equal((await tasks.PATCH(request("PATCH", { ...input, id: rows[0].id }))).status, 400);
    assert.equal((await tasks.PATCH(request("PATCH", { ...input, id: rows[5].id }))).status, 400);
    // The migration can be rolled back without modifying projects or tasks.
    await pool.query('ALTER TABLE project DROP COLUMN deleted');
    assert.equal((await pool.query('SELECT count(*) FROM project')).rows[0].count, "2");
    console.log("Project deletion checks passed (history, ongoing/future removal, isolation, sync, deleted-project guards, rollback).");
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
