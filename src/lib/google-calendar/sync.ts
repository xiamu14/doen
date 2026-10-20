import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarConnection, calendarEntry, calendarQueue } from "@/lib/db/schema/google-calendar";
import { task } from "@/lib/db/schema/task";
import { event } from "@/lib/db/schema/event";
import type { TaskRecord } from "@/client/api/task";
import type { EventRecord } from "@/client/api/event";
import { CalendarApiError, CalendarSyncError, calendarClient, type CalendarClient } from "./client";
import { serviceAccountConfigured, serviceAccountCredentials } from "./service-account";
import { planEvent, planTask, type SourceKind } from "./plan";

export const CONNECTION_ID = "personal";
type Change = { kind: SourceKind; id: string };
const connectionWhere = eq(calendarConnection.id, CONNECTION_ID);
const newGoogleId = () => `doen${randomUUID().replaceAll("-", "")}`;
const failureMessage = (error: unknown) => error instanceof CalendarSyncError ? error.message : "Calendar sync failed. Sync manually or wait for the next change.";

export async function connectServiceCalendar(userId: string) {
  const credentials = await serviceAccountCredentials();
  const [previous] = await db.select().from(calendarConnection).where(connectionWhere);
  if (previous && previous.userId !== userId) throw new CalendarSyncError("This workspace is connected to another Google account.");
  if (previous?.calendarId === credentials.calendarId && previous.serviceAccountEmail === credentials.client_email) return;
  await db.transaction(async (tx) => {
    const values = { calendarId: credentials.calendarId, serviceAccountEmail: credentials.client_email, accountId: null,
      lastError: null, lastSyncedAt: null, leaseToken: null, leaseUntil: null };
    if (previous) {
      const [updated] = await tx.update(calendarConnection).set(values).where(and(connectionWhere,
        or(isNull(calendarConnection.leaseUntil), lt(calendarConnection.leaseUntil, new Date())))).returning();
      if (!updated) throw new CalendarSyncError("Wait for the current sync to finish, then try again.");
    } else {
      const [created] = await tx.insert(calendarConnection).values({ id: CONNECTION_ID, userId, ...values }).onConflictDoNothing().returning();
      if (!created) throw new CalendarSyncError("Calendar settings changed. Refresh and try again.");
    }
    // Mappings belong to one calendar and identity; old remote calendars stay untouched.
    await tx.delete(calendarEntry);
  });
  await requestCalendarSync(true);
}

async function filterSyncChanges(changes: Change[]) {
  if (!changes.length) return [];
  const taskIds = changes.filter(({ kind }) => kind === "task").map(({ id }) => id);
  const eventIds = changes.filter(({ kind }) => kind === "event").map(({ id }) => id);
  const [tasks, events, entries] = await Promise.all([
    taskIds.length ? db.select().from(task).where(inArray(task.id, taskIds)) : [],
    eventIds.length ? db.select().from(event).where(inArray(event.id, eventIds)) : [],
    db.select({ kind: calendarEntry.kind, id: calendarEntry.sourceId }).from(calendarEntry)
      .where(inArray(calendarEntry.sourceId, changes.map(({ id }) => id))),
  ]);
  // Existing mappings still need updates or deletion, even when their source is past or excluded.
  const eligible = new Set(entries.map(({ kind, id }) => `${kind}:${id}`));
  const now = Date.now();
  for (const source of tasks) if (planTask(source as TaskRecord, now).length) eligible.add(`task:${source.id}`);
  for (const source of events) if (planEvent(source as EventRecord, now).length) eligible.add(`event:${source.id}`);
  return changes.filter(({ kind, id }) => eligible.has(`${kind}:${id}`));
}

export async function getPendingCalendarJobs() {
  const jobs = await db.select().from(calendarQueue);
  const eligible = new Set((await filterSyncChanges(jobs.map(({ kind, sourceId }) => ({ kind, id: sourceId }))))
    .map(({ kind, id }) => `${kind}:${id}`));
  return jobs.filter(({ key }) => eligible.has(key));
}

async function addJobs(changes: Change[]) {
  const unique = [...new Map(changes.map((change) => [`${change.kind}:${change.id}`, change])).values()];
  const eligible = await filterSyncChanges(unique);
  if (!eligible.length) return;
  await db.insert(calendarQueue).values(eligible.map(({ kind, id }) => ({ key: `${kind}:${id}`, kind, sourceId: id })))
    .onConflictDoUpdate({ target: calendarQueue.key, set: { version: sql`${calendarQueue.version} + 1`, error: null } });
}

async function addFullSyncJobs() {
  const [tasks, events, entries] = await Promise.all([
    db.select({ id: task.id }).from(task), db.select({ id: event.id }).from(event), db.select().from(calendarEntry),
  ]);
  await addJobs([
    ...tasks.map(({ id }) => ({ kind: "task" as const, id })),
    ...events.map(({ id }) => ({ kind: "event" as const, id })),
    ...entries.map(({ kind, sourceId }) => ({ kind, id: sourceId })),
  ]);
}

export async function requestCalendarSync(full = false) {
  if (full) await addFullSyncJobs();
  await db.update(calendarConnection).set({ generation: sql`${calendarConnection.generation} + 1`, lastError: null }).where(connectionWhere);
  after(() => drainCalendarQueue());
}

// Keep calendar outages from failing an already-saved task or event.
// shortcut: source commits before enqueue; use a transactional outbox if crash-proof capture is required.
export async function queueCalendarChanges(changes: Change[]) {
  try {
    const [connection] = await db.select().from(calendarConnection).where(connectionWhere);
    if (!connection?.serviceAccountEmail || !serviceAccountConfigured()) return;
    await addJobs(changes);
    if (connection.enabled) await requestCalendarSync();
  } catch {
    console.error("Could not enqueue Google Calendar changes. Manual full sync can recover them.");
  }
}

async function missing<T>(request: () => Promise<T>): Promise<T | null> {
  try { return await request(); }
  catch (error) {
    if (error instanceof CalendarApiError && (error.status === 404 || error.status === 410)) return null;
    throw error;
  }
}

async function writeEntry(client: CalendarClient, calendarId: string, row: typeof calendarEntry.$inferSelect) {
  const collection = `/calendars/${encodeURIComponent(calendarId)}/events`;
  let googleId = row.googleId;
  const existing = await missing(() => client<{ status?: string }>(`${collection}/${googleId}`));
  if (existing?.status === "cancelled") {
    googleId = newGoogleId();
    await db.update(calendarEntry).set({ googleId }).where(eq(calendarEntry.key, row.key));
  }
  if (existing && existing.status !== "cancelled") {
    await client(`${collection}/${googleId}`, "PUT", row.body);
  } else {
    try { await client(collection, "POST", { ...row.body, id: googleId }); }
    catch (error) {
      if (!(error instanceof CalendarApiError) || error.status !== 409) throw error;
      // Deleted Google IDs cannot be reused; retain a new ID before recreating.
      const conflict = await missing(() => client<{ status?: string }>(`${collection}/${googleId}`));
      if (conflict && conflict.status !== "cancelled") await client(`${collection}/${googleId}`, "PUT", row.body);
      else {
        googleId = newGoogleId();
        await db.update(calendarEntry).set({ googleId }).where(eq(calendarEntry.key, row.key));
        await client(collection, "POST", { ...row.body, id: googleId });
      }
    }
  }
}

async function syncSource(client: CalendarClient, calendarId: string, job: typeof calendarQueue.$inferSelect) {
  const sourceWhere = and(eq(calendarEntry.kind, job.kind), eq(calendarEntry.sourceId, job.sourceId));
  const existing = await db.select().from(calendarEntry).where(sourceWhere);
  const main = existing.find(({ variant }) => variant === "main");
  let planned;
  if (job.kind === "task") {
    const [source] = await db.select().from(task).where(eq(task.id, job.sourceId));
    planned = source ? planTask(source as TaskRecord, Date.now(), Boolean(main?.synced)) : [];
  } else {
    const [source] = await db.select().from(event).where(eq(event.id, job.sourceId));
    planned = source ? planEvent(source as EventRecord, Date.now(), main?.synced ? main.body : undefined) : [];
  }
  for (const row of existing) {
    if (planned.some(({ variant }) => variant === row.variant)) continue;
    await missing(() => client(`/calendars/${encodeURIComponent(calendarId)}/events/${row.googleId}`, "DELETE"));
    await db.delete(calendarEntry).where(eq(calendarEntry.key, row.key));
  }
  for (const item of planned) {
    const key = `${job.kind}:${job.sourceId}:${item.variant}`;
    const [row] = await db.insert(calendarEntry).values({ key, kind: job.kind, sourceId: job.sourceId,
      variant: item.variant, googleId: newGoogleId(), body: item.body,
    }).onConflictDoUpdate({ target: calendarEntry.key, set: { body: item.body } }).returning();
    await writeEntry(client, calendarId, row);
    await db.update(calendarEntry).set({ synced: true }).where(eq(calendarEntry.key, row.key));
  }
}

export async function drainCalendarQueue() {
  const leaseToken = randomUUID();
  const lease = () => new Date(Date.now() + 120_000);
  const [claimed] = await db.update(calendarConnection).set({ leaseToken, leaseUntil: lease() })
    .where(and(connectionWhere, or(isNull(calendarConnection.leaseUntil), lt(calendarConnection.leaseUntil, new Date())))).returning();
  if (!claimed) return;
  const owned = and(connectionWhere, eq(calendarConnection.leaseToken, leaseToken));
  try {
    while (true) {
      const [connection] = await db.select().from(calendarConnection).where(owned);
      if (!connection) return;
      let failure: string | null = null;
      try {
        if (connection.enabled) {
          const credentials = await serviceAccountCredentials();
          if (connection.calendarId !== credentials.calendarId || connection.serviceAccountEmail !== credentials.client_email) {
            throw new CalendarSyncError("Initialize the configured service account calendar first.");
          }
          const client = await calendarClient();
          const calendarId = credentials.calendarId;
          const access = await client<{ accessRole?: string }>(`/calendars/${encodeURIComponent(calendarId)}/events?maxResults=1&fields=accessRole`);
          if (access.accessRole !== "writer" && access.accessRole !== "owner") throw new CalendarSyncError("Share the calendar with the service account and allow event changes.");
          const queued = await db.select().from(calendarQueue);
          const eligible = new Set((await filterSyncChanges(queued.map(({ kind, sourceId }) => ({ kind, id: sourceId }))))
            .map(({ kind, id }) => `${kind}:${id}`));
          const jobs = queued.filter(({ key }) => eligible.has(key));
          for (const job of queued) {
            if (!eligible.has(job.key)) await db.delete(calendarQueue)
              .where(and(eq(calendarQueue.key, job.key), eq(calendarQueue.version, job.version)));
          }
          for (const job of jobs) {
            const [current] = await db.update(calendarConnection).set({ leaseUntil: lease() }).where(owned).returning();
            if (!current) return;
            if (current.enabled !== connection.enabled) break;
            try {
              await syncSource(client, calendarId, job);
              await db.delete(calendarQueue).where(and(eq(calendarQueue.key, job.key), eq(calendarQueue.version, job.version)));
            } catch (error) {
              failure = failureMessage(error);
              await db.update(calendarQueue).set({ error: failure }).where(and(eq(calendarQueue.key, job.key), eq(calendarQueue.version, job.version)));
              // A failed batch stays queued; only a later explicit trigger tries again.
              break;
            }
          }
        }
      } catch (error) {
        failure = failureMessage(error);
      }
      const [released] = await db.update(calendarConnection).set({ leaseToken: null, leaseUntil: null,
        lastError: failure, ...(failure || !connection.enabled ? {} : { lastSyncedAt: new Date() }),
      }).where(and(owned, eq(calendarConnection.generation, connection.generation))).returning();
      if (released) return;
      // Another mutation arrived during this pass; its generation is the next trigger.
    }
  } catch {
    console.error("Google Calendar queue stopped. Pending entries remain available for the next sync.");
    await db.update(calendarConnection).set({ lastError: "Sync was interrupted. Sync manually or wait for the next change." }).where(owned);
  } finally {
    await db.update(calendarConnection).set({ leaseToken: null, leaseUntil: null }).where(owned);
  }
}
