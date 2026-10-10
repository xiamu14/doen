"use client";

import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/utils";
import type { TaskRecord } from "@/client/api/task";
import { nearestFreeSlot, SLOT_HEIGHT, SLOT_MINUTES, slotFromStart, startFromSlot, taskModalX } from "./calendar-time";
type Props = {
  isNow: boolean;
  date: string;
  onAutoScroll: (time: Date) => void;
  tasks: TaskRecord[];
  onCreateTask: (start: string, x: number, y: number, top: number, bottom: number) => void;
};
function CurrentTimeLine({ date, onAutoScroll }: Pick<Props, "date" | "onAutoScroll">) {
  const [now, setNow] = useState(() => new Date());
  const lastAutoScroll = useRef(Date.now());

  useEffect(() => {
    const updateCurrentTime = (forceScroll = false) => {
      const time = new Date();
      setNow(time);
      if (dayjs(time).format("YYYY-MM-DD") === date &&
        (forceScroll || time.getTime() - lastAutoScroll.current >= 5 * 60_000)) {
        lastAutoScroll.current = time.getTime();
        onAutoScroll(time);
      }
    };
    updateCurrentTime(document.visibilityState === "visible");
    const interval = window.setInterval(() => updateCurrentTime(), 60_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") updateCurrentTime(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [date, onAutoScroll]);

  if (dayjs(now).format("YYYY-MM-DD") !== date) return null;
  return <div className="w-full h-[1px] absolute left-0 bg-[#f16767] z-10" style={{ top: slotFromStart(now.toISOString()) * SLOT_HEIGHT }} />;
}

export default function TaskCalendarRow({ isNow, date, onAutoScroll, tasks, onCreateTask }: Props) {
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
      {isNow && <CurrentTimeLine date={date} onAutoScroll={onAutoScroll} />}
    </div>
  );
}
