import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-utils";
import { calendarConnection } from "@/lib/db/schema/google-calendar";
import { CalendarSyncError } from "@/lib/google-calendar/errors";
import { serviceAccountCredentials } from "@/lib/google-calendar/service-account";
import { CONNECTION_ID, connectServiceCalendar, getPendingCalendarJobs, requestCalendarSync } from "@/lib/google-calendar/sync";
import { env } from "@/env";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ data: null });
  const [connection] = await db.select().from(calendarConnection).where(eq(calendarConnection.id, CONNECTION_ID));
  if (connection && connection.userId !== session.user.id) return NextResponse.json({ error: "This workspace is connected to another Google account." }, { status: 403 });
  let credentials;
  let configurationError: string | null = null;
  try { credentials = await serviceAccountCredentials(); }
  catch (error) { configurationError = error instanceof CalendarSyncError ? error.message : "Check the service account configuration."; }
  const connected = Boolean(credentials && connection?.calendarId === credentials.calendarId && connection.serviceAccountEmail === credentials.client_email);
  const pending = (await getPendingCalendarJobs()).length;
  return NextResponse.json({ data: {
    connected, enabled: connected && (connection?.enabled ?? false),
    running: Boolean(connection?.leaseUntil && connection.leaseUntil > new Date()), pending,
    lastSyncedAt: connected ? connection?.lastSyncedAt ?? null : null,
    error: configurationError ?? (connected ? connection?.lastError ?? (connection?.leaseUntil && connection.leaseUntil <= new Date()
      ? "Previous sync was interrupted. Sync manually or wait for the next change." : null) : null),
    configured: Boolean(credentials),
  } });
}

const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("connect") }), z.object({ action: z.literal("sync") }),
  z.object({ action: z.literal("toggle"), enabled: z.boolean() }),
]);

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin && origin !== new URL(env.BETTER_AUTH_URL).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in with Google first." }, { status: 401 });
  const parsed = command.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid calendar command." }, { status: 400 });
  const [connection] = await db.select().from(calendarConnection).where(eq(calendarConnection.id, CONNECTION_ID));
  if (connection && connection.userId !== session.user.id) return NextResponse.json({ error: "This workspace is connected to another Google account." }, { status: 403 });
  try {
    if (parsed.data.action === "connect") {
      await connectServiceCalendar(session.user.id);
    } else {
      const credentials = await serviceAccountCredentials();
      if (!connection || connection.calendarId !== credentials.calendarId || connection.serviceAccountEmail !== credentials.client_email) {
        return NextResponse.json({ error: "Initialize the configured service account calendar first." }, { status: 409 });
      }
      if (parsed.data.action === "toggle") {
        await db.update(calendarConnection).set({ enabled: parsed.data.enabled }).where(eq(calendarConnection.id, CONNECTION_ID));
      } else if (!connection.enabled) {
        return NextResponse.json({ error: "Enable calendar sync first." }, { status: 409 });
      }
      await requestCalendarSync(true);
    }
    return NextResponse.json({ data: { accepted: true } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof CalendarSyncError ? error.message : "Could not update calendar settings." }, { status: 400 });
  }
}
