"use client";
import { DialogUtils } from "../Dialog";

export default function TaskCalendarCard() {
  return (
    <div
      className="absolute left-[10%] w-[80%] h-[35px] bg-[#FDF1E0] rounded-[6px] flex flex-col justify-start px-[10px] overflow-hidden cursor-pointer"
      style={{ top: 30 }}
      onClick={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        // console.log("[rect]", rect);
        DialogUtils.show("taskModal", {
          x: rect.right + 6,
          y: rect.top - 10,
          taskId: "",
        });
      }}
    >
      <p className="text-[12px] font-semibold text-[#96753B] truncate flex-shrink-0">
        develop doen web app
      </p>
      <p className="text-[8px] mt-[4px] text-[#96753B] my-0">8:00 - 9:00</p>
      {/* <p className="text-[8px] text-[#96753B] my-0">9:00</p> */}
    </div>
  );
}
