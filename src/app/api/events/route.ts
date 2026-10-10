import { db } from "@/lib/db";
import { event } from "@/lib/db/schema/event";
import { asc, count, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PROJECT_COLORS } from "@/lib/project-colors";

const fields = z.object({
  title: z.string().trim().min(1).max(256),
  description: z.string().max(1024),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  }).nullable(),
  time: z.string().regex(/^(?:0[7-9]|1\d|2[0-3]):[0-5]\d$/).nullable(),
  recurrence: z.enum(["once", "someday", "daily", "weekly", "monthly"]),
  repeatDay: z.number().int().nullable(),
}).superRefine(({ date, time, recurrence, repeatDay }, context) => {
  const valid = recurrence === "once"
    ? date !== null && time !== null && repeatDay === null
    : recurrence === "someday"
      ? date !== null && time === null && repeatDay === null
      : recurrence === "daily"
      ? date === null && time !== null && repeatDay === null
      : recurrence === "weekly"
        ? date === null && time !== null && repeatDay !== null && repeatDay >= 0 && repeatDay <= 6
        : date === null && time !== null && repeatDay !== null && repeatDay >= 1 && repeatDay <= 31;
  if (!valid) context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid repeat settings." });
});

export async function GET() {
  const events = await db.select().from(event).orderBy(asc(event.date), asc(event.time));
  return NextResponse.json({ data: events });
}

export async function POST(request: NextRequest) {
  const body = fields.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid event data." }, { status: 400 });
  const [{ eventCount }] = await db.select({ eventCount: count() }).from(event);
  const color = PROJECT_COLORS[Number(eventCount) % PROJECT_COLORS.length];
  const [created] = await db.insert(event).values({ ...body.data, color }).returning();
  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = fields.and(z.object({ id: z.string().uuid() })).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid event data." }, { status: 400 });
  const { id, ...values } = body.data;
  const [updated] = await db.update(event).set(values).where(eq(event.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(request: NextRequest) {
  const body = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid event ID." }, { status: 400 });
  const [deleted] = await db.delete(event).where(eq(event.id, body.data.id)).returning();
  if (!deleted) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ data: deleted });
}
