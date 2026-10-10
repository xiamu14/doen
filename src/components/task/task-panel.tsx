"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import dayjs from "dayjs";
import { Calendar } from "lucide-react";
import { useState } from "react";
import TaskCalendar from "./task-calendar";
import MonthCalendar from "@/components/ui/month-calendar";
import { useQuery } from "@tanstack/react-query";
import { getEvents } from "@/client/api/event";

export default function TaskPanel() {
  const [activeDay, setActiveDay] = useState(() => dayjs().startOf("day"));
  const [calendarMonth, setCalendarMonth] = useState(() => activeDay.format("YYYY-MM"));
  const { data: events = [] } = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const somedayCount = events.filter((event) => event.recurrence === "someday" && event.date && event.date >= dayjs().format("YYYY-MM-DD")).length;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-between mb-[20px]">
        <Popover className="relative">
          <PopoverButton className="flex h-[32px] items-center gap-1 rounded-[8px] border border-[#eee] px-[8px] text-[14px] font-semibold text-content outline-none">
            <Calendar size={14} color="#666" />
            Calendar{somedayCount > 0 ? ` (${somedayCount})` : ""}
          </PopoverButton>
          <PopoverPanel
            anchor="bottom start"
            transition
            className="z-20 mt-[6px] w-[280px] rounded-[12px] border border-[#f1f1f1] bg-white p-3 text-content shadow-modal outline-none duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
          >
            {({ close }) => (
              <MonthCalendar
                month={calendarMonth}
                value={activeDay.format("YYYY-MM-DD")}
                onMonthChange={setCalendarMonth}
                events={events}
                onSelect={(date) => {
                  setActiveDay(dayjs(`${date}T00:00:00`));
                  close();
                }}
              />
            )}
          </PopoverPanel>
        </Popover>
        <div className="flex items-center h-[32px] rounded-[8px] border-[1px] bg-[white] text-content font-semibold text-[16px] overflow-hidden flex-grow-0">
          <div className="flex justify-center items-center px-[8px] h-full bg-switch-layout-active cursor-pointer text-[14px]">
            Timeline
          </div>
          <div className="w-[1px] h-full bg-switch-layout-active"></div>
          <div className="h-full center px-[8px] cursor-pointer text-content-secondary text-[14px]">
            Kanban
          </div>
        </div>
      </div>
      <TaskCalendar activeDay={activeDay} />
    </div>
  );
}
