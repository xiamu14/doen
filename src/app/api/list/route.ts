import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { project, task } from "@/lib/db/schema/task";
import { asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { PROJECT_COLORS } from "@/lib/project-colors";

export async function GET(request: NextRequest) {
  const projects = await db.select().from(project).orderBy(asc(project.createdAt), asc(project.id));

  return NextResponse.json({ data: { project: projects } });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 20) {
    return NextResponse.json({ error: "Project name must be 1–20 characters." }, { status: 400 });
  }

  const [{ projectCount }] = await db.select({ projectCount: count() }).from(project);
  const [created] = await db.insert(project)
    .values({ name, color: PROJECT_COLORS[Number(projectCount) % PROJECT_COLORS.length] })
    .onConflictDoNothing({ target: project.name })
    .returning();
  if (!created) {
    return NextResponse.json({ error: "A project with this name already exists." }, { status: 409 });
  }
  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = z.string().uuid().safeParse(body?.id);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!id.success || !name || name.length > 20) {
    return NextResponse.json({ error: "A valid project ID and a 1–20 character name are required." }, { status: 400 });
  }

  try {
    const [updated] = await db.update(project).set({ name }).where(eq(project.id, id.data)).returning();
    if (!updated) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (error) {
    const databaseError = error as { code?: string; cause?: { code?: string } };
    if (databaseError.code === "23505" || databaseError.cause?.code === "23505") {
      return NextResponse.json({ error: "A project with this name already exists." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = z.string().uuid().safeParse(body?.id);
  if (!id.success) {
    return NextResponse.json({ error: "A valid project ID is required." }, { status: 400 });
  }

  const [deleted] = await db.transaction(async (tx) => {
    await tx.update(task).set({ projectId: null }).where(eq(task.projectId, id.data));
    return tx.delete(project).where(eq(project.id, id.data)).returning();
  });
  if (!deleted) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({ data: deleted });
}
