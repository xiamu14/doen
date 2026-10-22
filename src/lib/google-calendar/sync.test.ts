import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { env } from "@/env";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, account } from "@/lib/db/schema/user";
import { task } from "@/lib/db/schema/task";
import { event } from "@/lib/db/schema/event";
import { calendarConnection, calendarEntry, calendarQueue } from "@/lib/db/schema/google-calendar";
import { GOOGLE_CALENDAR_SCOPE } from "./config";
import { CONNECTION_ID, connectServiceCalendar, drainCalendarQueue, getPendingCalendarJobs, queueCalendarChanges, requestCalendarSync } from "./sync";

test("persistent calendar queue", async (t) => {
  const fixture = JSON.parse(await readFile(env.GOOGLE_SERVICE_ACCOUNT_FILE!, "utf8"));
  const clientEmail = "queue-test@example.iam.gserviceaccount.com";
  await writeFile(env.GOOGLE_SERVICE_ACCOUNT_FILE!, JSON.stringify({ ...fixture, client_email: clientEmail }));
  const records = new Map<string, Record<string, unknown>>();
  let requests = 0;
  let failed = false;
  let loseCreateResponse = false;
  let onWrite: (() => Promise<void>) | undefined;
  let accessRole = "writer";
  let tokenRequests = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requests++;
    if (failed) return Response.json({}, { status: 503 });
    if (new URL(String(input)).hostname === "oauth2.googleapis.com") {
      tokenRequests++;
      return Response.json({ access_token: "refreshed-test-token", expires_in: 3600 });
    }
    const path = new URL(String(input)).pathname.replace("/calendar/v3", "");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    assert.ok(path.startsWith("/calendars/test-calendar/events"), "service accounts must only access the configured calendar's events");
    if (path === "/calendars/test-calendar/events" && method === "GET") return Response.json({ accessRole });
    if (method === "PUT" || method === "POST") {
      assert.equal("reminders" in body, false, "personal reminder settings must not be written");
      for (const field of ["start", "end"]) assert.match(body[field].dateTime, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "Google requires RFC3339 timestamps");
    }
    const id = path.split("/").at(-1)!;
    if (method === "GET") return records.has(id) ? Response.json(records.get(id)) : Response.json({}, { status: 404 });
    if (method === "POST") {
      if (records.has(body.id)) return Response.json({}, { status: 409 });
      records.set(body.id, body);
      if (loseCreateResponse) { loseCreateResponse = false; throw new TypeError("Connection lost after insert"); }
      return Response.json(body);
    }
    if (!records.has(id) || records.get(id)?.status === "cancelled") return Response.json({}, { status: 404 });
    if (method === "DELETE") { records.set(id, { status: "cancelled" }); return new Response(null, { status: 204 }); }
    if (onWrite) { const callback = onWrite; onWrite = undefined; await callback(); }
    records.set(id, method === "PATCH" ? { ...records.get(id), ...body } : body);
    return Response.json(records.get(id));
  });
  const active = () => [...records.values()].filter((row) => row.status !== "cancelled");
  const now = new Date();
  const id = randomUUID();
  const eventId = randomUUID();
  await db.insert(user).values({ id: "owner", name: "Owner", email: "owner@example.test", emailVerified: true, createdAt: now, updatedAt: now });
  await db.insert(account).values({ id: "google-account", accountId: "google-subject", providerId: "google", userId: "owner",
    scope: GOOGLE_CALENDAR_SCOPE, accessToken: "test-token", refreshToken: "test-refresh", accessTokenExpiresAt: new Date(Date.now() + 3600_000), createdAt: now, updatedAt: now });
  await db.insert(calendarConnection).values({ id: CONNECTION_ID, userId: "owner", accountId: "google-account" });
  await db.insert(task).values({ id, title: "Original", content: "", start: new Date(Date.now() + 86400_000).toISOString(), duration: 60 });
  const changes = [{ kind: "task" as const, id }];

  await t.test("full sync and pending exclude ended and daily sources, including stale queue jobs", async () => {
    const pastTask = randomUUID();
    const endedTask = randomUUID();
    const pastEvent = randomUUID();
    const dailyEvent = randomUUID();
    await db.insert(task).values([
      { id: pastTask, title: "Past", content: "", start: new Date(Date.now() - 86400_000).toISOString(), duration: 60 },
      { id: endedTask, title: "Ended", content: "", start: new Date(Date.now() - 61 * 60_000).toISOString(), duration: 60 },
    ]);
    await db.insert(event).values([
      { id: pastEvent, title: "Past event", recurrence: "once", date: "2000-01-01", time: "08:00" },
      { id: dailyEvent, title: "Daily", recurrence: "daily", time: "08:00" },
    ]);
    await requestCalendarSync(true);
    assert.deepEqual((await db.select().from(calendarQueue)).map(({ sourceId }) => sourceId), [id]);
    await db.insert(calendarQueue).values({ key: `task:${pastTask}`, kind: "task", sourceId: pastTask });
    assert.equal((await getPendingCalendarJobs()).length, 1);
  });

  await t.test("switching from OAuth binds the configured shared calendar without creating another calendar", async () => {
    await connectServiceCalendar("owner");
    const [connection] = await db.select().from(calendarConnection);
    assert.equal(connection.accountId, null);
    assert.equal(connection.calendarId, "test-calendar");
    assert.equal(connection.serviceAccountEmail, clientEmail);
    assert.equal(requests, 0);
    await drainCalendarQueue();
    assert.equal(active().length, 2);
    assert.equal((await db.select().from(calendarQueue)).length, 0, "legacy excluded jobs must be removed");
    assert.equal(tokenRequests, 1);
  });

  await t.test("automatic changes also exclude unmapped historical tasks and daily events", async () => {
    const tasks = await db.select().from(task);
    const events = await db.select().from(event);
    await queueCalendarChanges([
      ...tasks.filter((source) => source.id !== id).map(({ id }) => ({ kind: "task" as const, id })),
      ...events.map(({ id }) => ({ kind: "event" as const, id })),
    ]);
    assert.equal((await db.select().from(calendarQueue)).length, 0);
  });

  await t.test("new ongoing tasks sync automatically and manual sync recovers missing queue jobs", async () => {
    const ongoingId = randomUUID();
    await db.insert(task).values({ id: ongoingId, title: "AI practice", content: "", start: new Date(Date.now() - 60_000).toISOString(), duration: 60 });
    await queueCalendarChanges([{ kind: "task", id: ongoingId }]);
    assert.equal((await getPendingCalendarJobs()).length, 1);
    await db.delete(calendarQueue);
    await requestCalendarSync(true);
    assert.equal((await getPendingCalendarJobs()).length, 1);
    await drainCalendarQueue();
    const entries = await db.select().from(calendarEntry).where(eq(calendarEntry.sourceId, ongoingId));
    assert.equal(entries.length, 2);
    assert.ok(entries.every((entry) => entry.synced));
    await requestCalendarSync(true);
    assert.equal((await getPendingCalendarJobs()).length, 0);
    await db.delete(task).where(eq(task.id, ongoingId));
    await queueCalendarChanges([{ kind: "task", id: ongoingId }]);
    await drainCalendarQueue();
    assert.equal(active().length, 2);
  });

  await t.test("read-only calendar sharing stops writes and leaves work queued", async () => {
    accessRole = "reader";
    await db.update(task).set({ title: "Needs calendar access" }).where(eq(task.id, id));
    await queueCalendarChanges(changes);
    const before = requests;
    await drainCalendarQueue();
    assert.equal(requests - before, 1);
    assert.match((await db.select().from(calendarConnection))[0].lastError!, /allow event changes/);
    assert.equal(active().length, 2);
    accessRole = "writer";
    await queueCalendarChanges(changes);
    await drainCalendarQueue();
  });

  await t.test("coalesces changes and writes the latest source only once", async () => {
    await db.update(task).set({ title: "First edit" }).where(eq(task.id, id));
    await queueCalendarChanges(changes);
    await db.update(task).set({ title: "Latest" }).where(eq(task.id, id));
    await queueCalendarChanges(changes);
    const [queued] = await db.select().from(calendarQueue);
    assert.equal(queued.version, 2);
    await drainCalendarQueue();
    assert.equal(active().length, 2);
    assert.ok(active().some((body) => body.summary === "Latest"));
    assert.equal((await db.select().from(calendarQueue)).length, 0);
  });

  await t.test("keeps failures without retry; the next trigger includes the failed work", async () => {
    await db.insert(event).values({ id: eventId, title: "Weekly", recurrence: "weekly", repeatDay: 2 });
    await queueCalendarChanges([{ kind: "event", id: eventId }]);
    failed = true;
    const before = requests;
    await drainCalendarQueue();
    assert.equal(requests - before, 1);
    assert.equal((await db.select().from(calendarQueue)).length, 1);
    assert.ok((await db.select().from(calendarConnection))[0].lastError);
    failed = false;
    await queueCalendarChanges(changes);
    await drainCalendarQueue();
    assert.equal((await db.select().from(calendarQueue)).length, 0);
    assert.equal(active().length, 3);
  });

  await t.test("concurrent changes survive queue acknowledgement and run in the next generation", async () => {
    onWrite = async () => {
      await db.update(task).set({ title: "Concurrent latest" }).where(eq(task.id, id));
      await queueCalendarChanges(changes);
      const before = requests;
      await drainCalendarQueue();
      assert.equal(requests, before, "a second worker must not acquire the lease");
    };
    await db.update(task).set({ title: "Before concurrent edit" }).where(eq(task.id, id));
    await queueCalendarChanges(changes);
    await drainCalendarQueue();
    assert.ok(active().some((body) => body.summary === "Concurrent latest"));
    assert.equal((await db.select().from(calendarQueue)).length, 0);
  });

  await t.test("completion removes the end marker; reopening restores the future marker", async () => {
    await db.update(task).set({ status: "done" }).where(eq(task.id, id));
    await queueCalendarChanges(changes);
    await drainCalendarQueue();
    assert.equal(active().length, 2);
    const main = (await db.select().from(calendarEntry)).find((row) => row.kind === "task")!;
    assert.equal("reminders" in main.body, false);
    await requestCalendarSync(true);
    assert.equal((await db.select().from(calendarQueue)).length, 0, "unchanged completed tasks stay out of the queue");
    await db.update(task).set({ status: "idle" }).where(eq(task.id, id));
    await queueCalendarChanges(changes);
    await drainCalendarQueue();
    assert.equal(active().length, 3);
  });

  await t.test("service account tokens renew without reading or updating user OAuth tokens", async () => {
    const realNow = Date.now();
    const clock = t.mock.method(Date, "now", () => realNow + 3601_000);
    try {
      await db.update(task).set({ content: "Requires renewed token" }).where(eq(task.id, id));
      await queueCalendarChanges(changes);
      await drainCalendarQueue();
      assert.equal(tokenRequests, 2);
      assert.equal((await db.select().from(account).where(eq(account.id, "google-account")))[0].accessToken, "test-token");
      assert.equal((await db.select().from(calendarQueue)).length, 0);
    } finally { clock.mock.restore(); }
  });

  await t.test("unexpected errors never expose token or database details in status", async () => {
    onWrite = async () => { throw new Error("private-token-do-not-expose"); };
    await db.update(task).set({ content: "Failed update" }).where(eq(task.id, id));
    await queueCalendarChanges(changes);
    await drainCalendarQueue();
    assert.equal((await db.select().from(calendarConnection))[0].lastError,
      "Calendar sync failed. Sync manually or wait for the next change.");
    assert.equal((await db.select().from(calendarQueue)).length, 1);
    assert.equal((await getPendingCalendarJobs()).length, 1, "a persisted body is not acknowledged until Google succeeds");
    assert.equal((await db.select().from(calendarEntry)).find((row) => row.kind === "task" && row.variant === "main")!.synced, false);
    await requestCalendarSync(true);
    await drainCalendarQueue();
    assert.ok(active().some((body) => body.description === "Failed update"));
    assert.equal((await db.select().from(calendarQueue)).length, 0);
  });

  await t.test("pausing makes no Google requests and keeps entries and personal reminders intact", async () => {
    await db.update(calendarConnection).set({ enabled: false });
    const snapshot = JSON.stringify(active());
    const before = requests;
    await requestCalendarSync(true);
    await drainCalendarQueue();
    assert.equal(requests, before);
    assert.equal(JSON.stringify(active()), snapshot);
    const [paused] = await db.select().from(calendarConnection);
    await db.update(task).set({ title: "Edited while paused" }).where(eq(task.id, id));
    await queueCalendarChanges(changes);
    assert.equal((await db.select().from(calendarConnection))[0].generation, paused.generation);
    await db.update(calendarConnection).set({ enabled: true });
    await requestCalendarSync(true);
    await drainCalendarQueue();
    assert.ok(active().some((body) => body.summary === "Edited while paused"));
    assert.equal((await db.select().from(calendarQueue)).length, 0);
  });

  await t.test("unchanged tasks and recurring events are skipped by automatic and manual sync, including stale jobs", async () => {
    await db.insert(calendarQueue).values([
      { key: `task:${id}`, kind: "task", sourceId: id },
      { key: `event:${eventId}`, kind: "event", sourceId: eventId },
    ]);
    assert.equal((await getPendingCalendarJobs()).length, 0);
    await queueCalendarChanges([...changes, { kind: "event", id: eventId }]);
    await requestCalendarSync(true);
    assert.ok((await db.select().from(calendarQueue)).every((row) => row.version === 1));
    const before = requests;
    await drainCalendarQueue();
    assert.equal(requests, before, "no token or calendar request is needed for unchanged sources");
    assert.equal((await db.select().from(calendarQueue)).length, 0);
    const clock = t.mock.method(Date, "now", () => Date.parse((active().find((body) => body.summary === "Edited while paused")!.end as { dateTime: string }).dateTime) + 86400_000);
    try {
      await requestCalendarSync(true);
      assert.equal((await db.select().from(calendarQueue)).length, 0, "elapsed markers and recurring anchors do not create changes");
    } finally { clock.mock.restore(); }
  });

  await t.test("changed sources restore Google edits and deleted IDs", async () => {
    const entries = await db.select().from(calendarEntry);
    const main = entries.find((row) => row.kind === "task" && row.variant === "main")!;
    records.set(main.googleId, { status: "cancelled" });
    const weekly = entries.find((row) => row.kind === "event")!;
    records.set(weekly.googleId, { ...records.get(weekly.googleId), summary: "Google edit" });
    await db.update(task).set({ content: "Restore deleted record" }).where(eq(task.id, id));
    await db.update(event).set({ description: "Restore edited record" }).where(eq(event.id, eventId));
    await requestCalendarSync(true);
    await drainCalendarQueue();
    assert.equal(active().length, 3);
    assert.ok(active().some((body) => body.summary === "Weekly"));
    assert.notEqual((await db.select().from(calendarEntry).where(eq(calendarEntry.key, main.key)))[0].googleId, main.googleId);
  });

  await t.test("a lost create response does not create duplicates on the next explicit sync", async () => {
    await db.update(task).set({ status: "done" }).where(eq(task.id, id));
    await queueCalendarChanges(changes);
    await drainCalendarQueue();
    await db.update(task).set({ status: "idle" }).where(eq(task.id, id));
    await queueCalendarChanges(changes);
    loseCreateResponse = true;
    await drainCalendarQueue();
    assert.equal(active().length, 3);
    assert.equal((await db.select().from(calendarQueue)).length, 1);
    assert.equal((await getPendingCalendarJobs()).length, 1);
    await requestCalendarSync(true);
    await drainCalendarQueue();
    assert.equal(active().length, 3);
  });

  await t.test("deletion takes precedence and excluded daily events are removed", async () => {
    await queueCalendarChanges(changes);
    await db.delete(task).where(eq(task.id, id));
    await queueCalendarChanges(changes);
    await db.update(event).set({ recurrence: "daily", repeatDay: null, time: "08:00" }).where(eq(event.id, eventId));
    await queueCalendarChanges([{ kind: "event", id: eventId }]);
    await drainCalendarQueue();
    assert.equal(active().length, 0);
    assert.equal((await db.select().from(calendarEntry)).length, 0);
    assert.equal((await db.select().from(calendarQueue)).length, 0);
  });

  await t.test("rebinding waits for an active worker and leaves the old remote calendar untouched", async () => {
    await db.update(calendarConnection).set({ calendarId: "old-private-calendar", serviceAccountEmail: "old@example.iam.gserviceaccount.com",
      leaseToken: "other-worker", leaseUntil: new Date(Date.now() + 120_000) });
    const before = requests;
    await assert.rejects(connectServiceCalendar("owner"), /Wait for the current sync/);
    assert.equal((await db.select().from(calendarConnection))[0].calendarId, "old-private-calendar");
    await db.update(calendarConnection).set({ leaseToken: null, leaseUntil: null });
    await connectServiceCalendar("owner");
    assert.equal(requests, before);
    assert.equal((await db.select().from(calendarConnection))[0].calendarId, "test-calendar");
    await drainCalendarQueue();
    assert.equal(active().length, 0);
    assert.equal((await db.select().from(calendarQueue)).length, 0);
  });
});
