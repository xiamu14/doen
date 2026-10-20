import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { env } from "@/env";
import { CalendarApiError, calendarClient } from "./client";

test("Google API errors distinguish disabled API, service account access and rate limits without retrying", async (t) => {
  const fixture = JSON.parse(await readFile(env.GOOGLE_SERVICE_ACCOUNT_FILE!, "utf8"));
  await writeFile(env.GOOGLE_SERVICE_ACCOUNT_FILE!, JSON.stringify({ ...fixture, client_email: "client-test@example.iam.gserviceaccount.com" }));
  let status = 503;
  let payload: unknown = {};
  const mock = t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    if (String(input) === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "service-test-token", expires_in: 3600 });
    return Response.json(payload, { status });
  });
  const request = await calendarClient();
  const cases = [
    { status: 403, payload: { error: { message: "private-do-not-display", errors: [{ reason: "accessNotConfigured" }], details: [{ reason: "SERVICE_DISABLED" }] } }, expected: /API is not enabled/ },
    { status: 403, payload: { error: { details: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] } }, expected: /^Share the calendar/ },
    { status: 403, payload: { error: { errors: [{ reason: "insufficientPermissions" }] } }, expected: /^Share the calendar/ },
    { status: 403, payload: { error: { errors: [{ reason: "userRateLimitExceeded" }] } }, expected: /rate limit/ },
    { status: 403, payload: { error: { errors: [{ reason: "forbidden" }] } }, expected: /^Share the calendar/ },
    { status: 401, payload: {}, expected: /service account credentials/ },
    { status: 404, payload: {}, expected: /Calendar ID and calendar sharing/ },
    { status: 429, payload: {}, expected: /rate limit/ },
    { status: 503, payload: { error: { errors: null, details: [null] } }, expected: /503/ },
  ];
  for (const item of cases) {
    status = item.status;
    payload = item.payload;
    const before = mock.mock.callCount();
    await assert.rejects(request("/calendars/test-calendar/events"), (error: unknown) => {
      assert.ok(error instanceof CalendarApiError);
      assert.match(error.message, item.expected);
      assert.ok(!error.message.includes("private-do-not-display"));
      return true;
    });
    assert.equal(mock.mock.callCount() - before, 1);
  }
});
