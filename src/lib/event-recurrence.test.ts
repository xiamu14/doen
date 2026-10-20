import assert from "node:assert/strict";
import { test } from "node:test";
import type { EventRecord } from "@/client/api/event";
import { eventHasTime, nextEventOccurrence } from "./event-recurrence";

const event: EventRecord = {
  id: "event", title: "Event", description: "", color: "#69D571",
  recurrence: "weekly", date: null, time: null, repeatDay: 2,
};
const now = new Date(2026, 9, 20, 15, 0);

test("weekly events remain upcoming throughout their day, including legacy records with a time", () => {
  for (const time of [null, "07:00"]) {
    assert.deepEqual(nextEventOccurrence({ ...event, time }, now), { date: "2026-10-20", time: null });
  }
  assert.deepEqual(nextEventOccurrence({ ...event, repeatDay: 1 }, now), { date: "2026-10-26", time: null });
});

test("monthly events retain the last-day rule in short months", () => {
  assert.deepEqual(nextEventOccurrence({ ...event, recurrence: "monthly", repeatDay: 31 }, new Date(2026, 1, 28, 15)), {
    date: "2026-02-28", time: null,
  });
});

test("only Sometime and Every day retain a time", () => {
  assert.equal(eventHasTime("once"), true);
  assert.equal(eventHasTime("daily"), true);
  for (const recurrence of ["someday", "weekly", "monthly"] as const) assert.equal(eventHasTime(recurrence), false);
  assert.deepEqual(nextEventOccurrence({ ...event, recurrence: "daily", time: "07:00" }, now), {
    date: "2026-10-21", time: "07:00",
  });
  assert.equal(nextEventOccurrence({ ...event, recurrence: "once", date: "2026-10-20", time: "07:00" }, now), null);
  assert.deepEqual(nextEventOccurrence({ ...event, recurrence: "someday", date: "2026-10-20" }, now), {
    date: "2026-10-20", time: null,
  });
});
