import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { account, user } from "./user";
import type { CalendarEvent, SourceKind } from "@/lib/google-calendar/plan";

export const calendarConnection = pgTable("google_calendar_connection", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").references(() => account.id, { onDelete: "set null" }),
  serviceAccountEmail: text("service_account_email"),
  calendarId: text("calendar_id"),
  enabled: boolean("enabled").notNull().default(true),
  generation: integer("generation").notNull().default(0),
  leaseToken: text("lease_token"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  lastError: text("last_error"),
});

export const calendarQueue = pgTable("google_calendar_queue", {
  key: text("key").primaryKey(),
  kind: text("kind").$type<SourceKind>().notNull(),
  sourceId: text("source_id").notNull(),
  version: integer("version").notNull().default(1),
  error: text("error"),
});

export const calendarEntry = pgTable("google_calendar_entry", {
  key: text("key").primaryKey(),
  kind: text("kind").$type<SourceKind>().notNull(),
  sourceId: text("source_id").notNull(),
  variant: text("variant").notNull(),
  googleId: text("google_id").notNull(),
  synced: boolean("synced").notNull().default(false),
  body: jsonb("body").$type<CalendarEvent>().notNull(),
});
