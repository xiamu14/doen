import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const project = pgTable("project", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar("name", { length: 20 }).notNull().unique(),
  color: varchar("color", { length: 10 }).notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
});

export const projectRelations = relations(project, ({ many }) => ({
  tasks: many(task),
}));

export const tag = pgTable("tag", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar("name", { length: 20 }).notNull().unique(),
  color: varchar("color", { length: 10 }).notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
});

export const tagRelations = relations(tag, ({ many }) => ({
  tasks: many(task),
}));

export const taskStatusEnum = pgEnum("status", ["idle", "doing", "done"]);

export const task = pgTable("task", {
  id: uuid().defaultRandom().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  content: varchar("content", { length: 1024 }).notNull(),
  status: taskStatusEnum().default("idle"),
  start: timestamp("start_at", {
    precision: 6,
    withTimezone: true,
    mode: "string",
  }).notNull(),
  duration: integer("duration").notNull(), // minutes，15、30、45、1h

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
  projectId: uuid("project_id"),
  tagId: uuid("tag_id"),
});

export const taskRelations = relations(task, ({ one }) => ({
  project: one(project, {
    fields: [task.projectId],
    references: [project.id],
  }),
  tag: one(tag, {
    fields: [task.tagId],
    references: [tag.id],
  }),
}));
