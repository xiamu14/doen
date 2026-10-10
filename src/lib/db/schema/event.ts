import { pgTable, timestamp, uuid, varchar, date, smallint } from "drizzle-orm/pg-core";

export const event = pgTable("event", {
  id: uuid().defaultRandom().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  description: varchar("description", { length: 1024 }).notNull().default(""),
  color: varchar("color", { length: 10 }).notNull().default("#69D571"),
  date: date("event_date", { mode: "string" }),
  time: varchar("event_time", { length: 5 }),
  recurrence: varchar("recurrence", { length: 10 }).notNull().default("once"),
  repeatDay: smallint("repeat_day"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => new Date()),
});
