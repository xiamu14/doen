"use server";

import { eq } from "drizzle-orm";
import { project } from "@/lib/db/schema/task";

import { db } from "@/lib/db";

export async function getInbox() {
  const inbox = await db.query.project.findFirst({
    where: eq(project.name, "inbox"),
  });
  const result =
    inbox ??
    (await db.insert(project).values({
      name: "inbox",
      color: "#F2BB59",
    }));
  return result;
}
