import { db } from "@/lib/db";
import { project, tag } from "@/lib/db/schema/task";
import { NextResponse } from "next/server";

export async function POST() {
  await db.insert(project).values({
    name: "inbox",
    color: "#F2BB59",
  });
  await db.insert(tag).values([
    {
      name: "easy",
      color: "#69D571",
    },
    {
      name: "difficulty",
      color: "#D569B2",
    },
    {
      name: "pressing",
      color: "#697ED5",
    },
    {
      name: "later",
      color: "#D5C169",
    },
  ]);
  return NextResponse.json({ error: null, data: null });
}
