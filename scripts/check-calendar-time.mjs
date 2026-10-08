import assert from "node:assert/strict";
import { clampSlot, nearestFreeSlot, slotFromStart, startFromSlot, taskModalX } from "../src/components/task/calendar-time.ts";

const start = new Date(2026, 9, 8, 8, 15).toISOString();
assert.equal(slotFromStart(start), 5);
const nextDay = new Date(startFromSlot("2026-10-09", 5));
assert.deepEqual([nextDay.getDate(), nextDay.getHours(), nextDay.getMinutes()], [9, 8, 15]);
assert.equal(clampSlot(-2), 0);
assert.equal(clampSlot(100, 4), 60);
assert.equal(nearestFreeSlot(3, [{ start: 4, duration: 4 }]), 2);
assert.equal(nearestFreeSlot(5, [{ start: 4, duration: 4 }]), 8);
assert.equal(nearestFreeSlot(0, [{ start: 0, duration: 64 }]), null);
assert.equal(taskModalX(389, 539, 1280), 530);
assert.equal(taskModalX(1139, 1289, 1280), 828);
assert.equal(taskModalX(1289, 1439, 1280), 952);
