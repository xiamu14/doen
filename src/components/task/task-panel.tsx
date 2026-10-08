import { Calendar } from "lucide-react";
import TaskCalendar from "./task-calendar";

export default function TaskPanel() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-between mb-[20px]">
        <div className="flex items-center h-[32px] rounded-[8px] border-[1px] border-[#eee] text-content font-semibold text-[16px] overflow-hidden flex-grow-0 px-[8px] gap-1">
          <Calendar size={14} color="#666" />
          <div className="h-full center  cursor-pointer text-[14px]">
            Calendar
          </div>
        </div>
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
      <TaskCalendar />
    </div>
  );
}
