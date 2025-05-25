import { eq } from "drizzle-orm";
import { project } from "@/lib/db/schema/task";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const inbox = await db.query.project.findFirst({
    where: eq(project.name, "inbox"),
    with: {
      tasks: true,
    },
  });
  const result =
    inbox ??
    (await db.insert(project).values({
      name: "inbox",
      color: "#F2BB59",
    }));
  return NextResponse.json(result);
}
