import TaskCalendar from "./task-calendar";

export default function TaskPanel() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-end mb-[44px]">
        <div className="flex items-center h-[34px] rounded-[8px] border-[1px] bg-[white] text-content font-semibold text-[16px] overflow-hidden flex-grow-0">
          <div className="flex justify-center items-center px-[10px] h-full bg-switch-layout-active cursor-pointer">
            Calendar
          </div>
          <div className="w-[1px] h-full bg-switch-layout-active"></div>
          <div className="h-full center px-[10px] cursor-pointer">Board</div>
        </div>
      </div>
      <TaskCalendar />
    </div>
  );
}
