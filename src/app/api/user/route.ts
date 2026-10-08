import { db } from "@/lib/db";
import { project } from "@/lib/db/schema/task";
import { NextResponse } from "next/server";

export async function POST() {
  await db.insert(project).values({
    name: "inbox",
    color: "#69D571",
  });
  return NextResponse.json({ error: null, data: null });
}
