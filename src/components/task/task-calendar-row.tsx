"use client";

import { cn } from "@/lib/utils";
import { DialogUtils } from "../Dialog";
import TaskCalendarCard from "./task-calendar-card";
type Props = {
  isNow: boolean;
};
export default function TaskCalendarRow({ isNow }: Props) {
  return (
    <div
      className={cn("w-[150px] h-full border-r-[#eee] border-r-1 relative")}
      onClick={(e) => {
        DialogUtils.show("taskModal", {
          x: e.clientX + 6,
          y: e.clientY - 10,
          taskId: "",
        });
      }}
    >
      {isNow && (
        <div className="w-full h-[1px] absolute top-[40px] left-[0] bg-[#f16767] z-10"></div>
      )}
    </div>
  );
}
