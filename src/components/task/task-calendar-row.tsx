"use client";

import { cn } from "@/components/ui/utils";
import type { TaskRecord } from "@/client/api/task";
import { nearestFreeSlot, SLOT_HEIGHT, SLOT_MINUTES, slotFromStart, startFromSlot, taskModalX } from "./calendar-time";
type Props = {
  isNow: boolean;
  date: string;
  tasks: TaskRecord[];
  onCreateTask: (start: string, x: number, y: number, top: number, bottom: number) => void;
};
export default function TaskCalendarRow({ isNow, date, tasks, onCreateTask }: Props) {
  return (
    <div
      data-calendar-day
      className={cn("w-[150px] flex-shrink-0 h-full border-r-[#eee] border-r-1 relative")}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const slot = nearestFreeSlot(
          (e.clientY - rect.top) / SLOT_HEIGHT,
          tasks.map((task) => ({ start: slotFromStart(task.start), duration: task.duration / SLOT_MINUTES })),
        );
        if (slot === null) return;
        const top = rect.top + slot * SLOT_HEIGHT;
        onCreateTask(
          startFromSlot(date, slot),
          taskModalX(rect.left, rect.right, window.innerWidth),
          e.clientY,
          top,
          top + 2 * SLOT_HEIGHT,
        );
      }}
    >
      {isNow && (
        <div className="w-full h-[1px] absolute left-[0] bg-[#f16767] z-10" style={{ top: slotFromStart(new Date().toISOString()) * SLOT_HEIGHT }}></div>
      )}
    </div>
  );
}
