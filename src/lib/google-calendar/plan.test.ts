import assert from "node:assert/strict";
import { test } from "node:test";
import type { TaskRecord } from "@/client/api/task";
import type { EventRecord } from "@/client/api/event";
import { planEvent, planTask } from "./plan";

const now = Date.parse("2026-10-20T00:00:00Z"); // 08:00 in Shanghai
const task: TaskRecord = { id: "task", title: "Work", content: "", start: "2026-10-20T01:00:00Z",
  duration: 60, status: "idle", projectId: null, tagId: null };
const event: EventRecord = { id: "event", title: "Event", description: "", color: "#69D571",
  date: "2026-10-21", time: null, recurrence: "someday", repeatDay: null };

test("database timestamps are normalized to RFC3339 before sending to Google", () => {
  const [main] = planTask({ ...task, start: "2026-10-20 01:00:00+00" }, now);
  assert.equal(main.body.start.dateTime, "2026-10-20T01:00:00.000Z");
  assert.equal(main.body.end.dateTime, "2026-10-20T02:00:00.000Z");
});

test("tasks use two correctly timed entries; completed tasks only keep their record without managing personal reminders", () => {
  const planned = planTask(task, now);
  assert.equal(planned.length, 2);
  assert.equal(planned[0].body.transparency, "opaque");
  assert.equal(planned[1].body.transparency, "transparent");
  assert.equal(planned[1].body.start.dateTime, "2026-10-20T01:55:00.000Z");
  assert.equal("reminders" in planned[0].body, false);
  const done = planTask({ ...task, status: "done" }, now);
  assert.equal(done.length, 1);
  assert.equal("reminders" in done[0].body, false);
});

test("initial sync excludes ongoing and past tasks, but preserves synced records and future end reminders", () => {
  assert.deepEqual(planTask(task, Date.parse(task.start)), []);
  const ongoing = planTask(task, Date.parse(task.start) + 10_000, true);
  assert.equal(ongoing.length, 2);
  assert.equal("reminders" in ongoing[0].body, false);
  assert.equal(planTask(task, Date.parse(task.start) + 60 * 60_000, true).length, 1);
});

test("Someday has exactly one 08:00 Shanghai entry and no past reminder is backfilled", () => {
  const planned = planEvent(event, now);
  assert.equal(planned.length, 1);
  assert.equal(planned[0].body.start.dateTime, "2026-10-21T00:00:00.000Z");
  assert.equal("reminders" in planned[0].body, false);
  assert.deepEqual(planEvent({ ...event, date: "2026-10-20" }, now), []);
});

test("Sometime keeps its time and leaves personal reminders to Calendar; Every day is excluded", () => {
  const sometime = { ...event, recurrence: "once" as const, time: "09:00" };
  const body = planEvent(sometime, now)[0].body;
  assert.equal(body.start.dateTime, "2026-10-21T01:00:00.000Z");
  assert.equal("reminders" in body, false);
  assert.deepEqual(planEvent({ ...event, recurrence: "daily", time: "09:00" }, now), []);
  assert.equal("reminders" in planEvent(sometime, Date.parse(body.start.dateTime) - 2 * 60_000)[0].body, false);
});

test("weekly events start on their next future day at 08:00 and retain their series anchor", () => {
  const weekly = { ...event, recurrence: "weekly" as const, date: null, repeatDay: 2, time: "23:00" };
  const body = planEvent(weekly, now)[0].body;
  assert.equal(body.start.dateTime, "2026-10-27T00:00:00.000Z");
  assert.deepEqual(body.recurrence, ["RRULE:FREQ=WEEKLY;BYDAY=TU"]);
  assert.equal(planEvent(weekly, now + 8 * 86400_000, body)[0].body.start.dateTime, body.start.dateTime);
});

test("monthly rules clamp day 29–31 to the last day in short months", () => {
  const february = Date.parse("2027-02-01T00:00:00Z");
  for (const repeatDay of [29, 30, 31]) {
    const body = planEvent({ ...event, recurrence: "monthly", repeatDay, date: null }, february)[0].body;
    assert.equal(body.start.dateTime, "2027-02-28T00:00:00.000Z");
    assert.ok(body.recurrence[0].includes(`BYMONTHDAY=${Array.from({ length: repeatDay - 27 }, (_, i) => 28 + i).join(",")};BYSETPOS=-1`));
  }
  const first = planEvent({ ...event, recurrence: "monthly", repeatDay: 1, date: null }, february)[0].body;
  assert.deepEqual(first.recurrence, ["RRULE:FREQ=MONTHLY;BYMONTHDAY=1;BYSETPOS=-1"]);
});
