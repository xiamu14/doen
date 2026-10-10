import { db } from "@/lib/db";
import { project, task } from "@/lib/db/schema/task";
import { and, eq, gt, lt, ne, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeTaskTagId } from "@/lib/task-tags";
import { FIRST_HOUR, LAST_HOUR, MAX_TASK_DURATION, MIN_TASK_DURATION, SLOT_MINUTES } from "@/lib/task-schedule-config";
import { isValidTaskWindow } from "@/lib/task-schedule";

const fields = z.object({
  title: z.string().trim().min(1).max(256),
  content: z.string().max(1024),
  start: z.string().datetime({ offset: true }),
  duration: z.number().int().min(MIN_TASK_DURATION).max(MAX_TASK_DURATION).refine((value) => value % SLOT_MINUTES === 0),
  timeZone: z.string().min(1).max(100).optional(),
  status: z.enum(["idle", "doing", "done"]).optional(),
  projectId: z.string().uuid().nullable().optional(),
  tagId: z.preprocess(normalizeTaskTagId,
    z.enum(["easy|pressing", "easy|later", "difficulty|pressing", "difficulty|later"]).nullable().optional()),
});

const serializeTask = (value: typeof task.$inferSelect) => ({
  ...value,
  start: new Date(value.start).toISOString(),
  tagId: normalizeTaskTagId(value.tagId),
});

async function overlapsTask(start: string, duration: number, excludeId?: string) {
  const end = new Date(new Date(start).getTime() + duration * 60_000).toISOString();
  const [overlap] = await db.select({ id: task.id }).from(task).where(and(
    lt(task.start, end),
    gt(sql`${task.start} + ${task.duration} * interval '1 minute'`, start),
    excludeId ? ne(task.id, excludeId) : undefined,
  )).limit(1);
  return Boolean(overlap);
}

async function projectExists(projectId?: string | null) {
  if (!projectId) return true;
  const [found] = await db.select({ id: project.id }).from(project).where(eq(project.id, projectId)).limit(1);
  return Boolean(found);
}

export async function GET() {
  const tasks = await db.select().from(task).orderBy(task.start);
  return NextResponse.json({ data: tasks.map(serializeTask) });
}

export async function POST(request: NextRequest) {
  const body = fields.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid task data." }, { status: 400 });
  const { timeZone = "UTC", ...values } = body.data;
  if (!isValidTaskWindow(values.start, values.duration, timeZone)) {
    return NextResponse.json({ error: `Tasks must fit between ${String(FIRST_HOUR).padStart(2, "0")}:00 and ${String(LAST_HOUR).padStart(2, "0")}:00 on one day.` }, { status: 400 });
  }
  if (!await projectExists(values.projectId)) {
    return NextResponse.json({ error: "Project not found." }, { status: 400 });
  }
  if (await overlapsTask(values.start, values.duration)) {
    return NextResponse.json({ error: "This time overlaps another task." }, { status: 409 });
  }
  const [created] = await db.insert(task).values(values).returning();
  return NextResponse.json({ data: serializeTask(created) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = fields.extend({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid task data." }, { status: 400 });
  const { id, timeZone = "UTC", ...values } = body.data;
  if (!isValidTaskWindow(values.start, values.duration, timeZone)) {
    return NextResponse.json({ error: `Tasks must fit between ${String(FIRST_HOUR).padStart(2, "0")}:00 and ${String(LAST_HOUR).padStart(2, "0")}:00 on one day.` }, { status: 400 });
  }
  if (!await projectExists(values.projectId)) {
    return NextResponse.json({ error: "Project not found." }, { status: 400 });
  }
  if (await overlapsTask(values.start, values.duration, id)) {
    return NextResponse.json({ error: "This time overlaps another task." }, { status: 409 });
  }
  const [updated] = await db.update(task).set(values).where(eq(task.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ data: serializeTask(updated) });
}

export async function DELETE(request: NextRequest) {
  const body = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid task ID." }, { status: 400 });
  const [deleted] = await db.delete(task).where(eq(task.id, body.data.id)).returning();
  if (!deleted) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ data: deleted });
}
