import dayjs from "dayjs";
import type { TaskRecord } from "@/client/api/task";

export function completedMinutesByDate(tasks: TaskRecord[]) {
  const totals: Record<string, number> = {};
  for (const task of tasks) {
    if (task.status !== "done") continue;
    const date = dayjs(task.start).format("YYYY-MM-DD");
    totals[date] = (totals[date] ?? 0) + task.duration;
  }
  return totals;
}

export function heatmapColor(minutes: number) {
  return minutes > 0
    ? `rgba(105, 213, 113, ${0.25 + 0.75 * Math.min(minutes / 480, 1)})`
    : "#edeef0";
}

export function slideDestination(page: number, offset: number, width: number) {
  return Math.abs(offset) > width / 2
    ? Math.max(0, Math.min(1, page + (offset < 0 ? 1 : -1)))
    : page;
}
