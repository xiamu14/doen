import assert from "node:assert/strict";
import { test } from "node:test";
import type { TaskRecord } from "@/client/api/task";
import { completedMinutesByDate, heatmapColor, slideDestination } from "./calendar-heatmap";

const task = (start: string, duration: number, status: TaskRecord["status"]): TaskRecord => ({
  id: start, title: "Test", content: "", start, duration, status, projectId: null, tagId: null,
});

test("heat map sums only completed tasks by local scheduled date", () => {
  assert.deepEqual(completedMinutesByDate([
    task("2026-10-23T08:00:00", 60, "done"),
    task("2026-10-23T10:00:00", 120, "done"),
    task("2026-10-23T13:00:00", 45, "doing"),
    task("2026-10-23T14:00:00", 30, "idle"),
    task("2026-10-24T08:00:00", 15, "done"),
  ]), { "2026-10-23": 180, "2026-10-24": 15 });
  assert.deepEqual(completedMinutesByDate([]), {});
});

test("heat map has gray zero, continuous opacity, and saturates at eight hours", () => {
  assert.equal(heatmapColor(0), "#edeef0");
  assert.equal(heatmapColor(15), "rgba(105, 213, 113, 0.2734375)");
  assert.equal(heatmapColor(120), "rgba(105, 213, 113, 0.4375)");
  assert.equal(heatmapColor(240), "rgba(105, 213, 113, 0.625)");
  assert.equal(heatmapColor(480), "rgba(105, 213, 113, 1)");
  assert.equal(heatmapColor(960), "rgba(105, 213, 113, 1)");
});

test("slides require more than half the viewport and cannot pass either end", () => {
  assert.equal(slideDestination(0, -149, 300), 0);
  assert.equal(slideDestination(0, -150, 300), 0);
  assert.equal(slideDestination(0, -151, 300), 1);
  assert.equal(slideDestination(1, 150, 300), 1);
  assert.equal(slideDestination(1, 151, 300), 0);
  assert.equal(slideDestination(0, 300, 300), 0);
  assert.equal(slideDestination(1, -300, 300), 1);
});
