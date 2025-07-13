import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const projects = await db.query.project.findMany();
  const tags = await db.query.tag.findMany();

  return NextResponse.json({ data: { project: projects, tag: tags } });
}
