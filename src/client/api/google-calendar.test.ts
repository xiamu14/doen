import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarFeedback } from "./google-calendar";

test("service account errors stay short and distinguish configuration from retryable failures", () => {
  assert.deepEqual(calendarFeedback("Google Calendar API is not enabled for this Google Cloud project."), {
    message: "Enable Google Calendar API to sync.", blocked: true,
  });
  assert.equal(calendarFeedback("Check the service account credentials.").blocked, true);
  assert.equal(calendarFeedback("This workspace is connected to another Google account.").blocked, true);
  assert.deepEqual(calendarFeedback("Share the calendar with the service account and allow event changes."), {
    message: "Allow the service account to edit this calendar.", blocked: true,
  });
  assert.deepEqual(calendarFeedback("Google Calendar request failed (503). Sync manually or wait for the next change."), {
    message: "Calendar sync failed. Try again.", blocked: false,
  });
  assert.equal(calendarFeedback().message, "");
});
