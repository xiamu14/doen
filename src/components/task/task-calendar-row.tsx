"use client";

import dayjs from "dayjs";
import { useEffect, useRef } from "react";
import { cn } from "@/components/ui/utils";
import type { TaskRecord } from "@/client/api/task";
import { nearestFreeSlot, SLOT_HEIGHT, SLOT_MINUTES, slotFromStart, startFromSlot, taskModalX } from "./calendar-time";
import { calendarTimeUpdates } from "./calendar-time-updates";
type Props = {
  date: string;
  tasks: TaskRecord[];
  onCreateTask: (start: string, x: number, y: number, top: number, bottom: number) => void;
};
function CurrentTimeLine({ date }: Pick<Props, "date">) {
  const lineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = (time: Date) => {
      const line = lineRef.current;
      if (!line) return;
      line.hidden = dayjs(time).format("YYYY-MM-DD") !== date;
      if (!line.hidden) line.style.top = `${slotFromStart(time.toISOString()) * SLOT_HEIGHT}px`;
    };
    update(new Date());
    return calendarTimeUpdates.subscribe(update);
  }, [date]);

  return <div ref={lineRef} hidden className="w-full h-[1px] absolute left-0 bg-[#f16767] z-10" />;
}

export default function TaskCalendarRow({ date, tasks, onCreateTask }: Props) {
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
      <CurrentTimeLine date={date} />
    </div>
  );
}
