import { cn } from "@/components/ui/utils";
import dayjs from "dayjs";
import { useMemo } from "react";
import TaskCalendarRow from "./task-calendar-row";
import TaskCalendarCard from "./task-calendar-card";

export default function TaskCalendar() {
  const dates = useMemo(() => {
    const start = dayjs().startOf("day");
    const days = Array.from({ length: 7 }, (_, i) => ({
      date: start.add(i, "day").format("YYYY-MM-DD"),
    }));
    return days;
  }, []);

  return (
    <div className="w-full">
      {/* 日期区域 */}
      <div className="calendar-header w-full h-[46px] bg-[rgba(238,238,238,.3)] rounded-[12px] overflow-hidden flex items-center">
        <div className="w-[96px] flex-shrink-0 h-full center font-bold text-[18px] text-calender-main">
          May
        </div>
        <div className="flex-1 flex flex-row w-0 items-center">
          {dates.map((item, index) => {
            const dateFn = dayjs(item.date);
            const isNow = dayjs().isSame(dateFn, "day");
            const formatted = dateFn.format("ddd D");
            return (
              <div
                key={`date-${index}`}
                className={"w-[150px] h-full center font-semibold text-[14px] "}
              >
                {isNow ? (
                  <div className="bg-[#DCECFF] w-[68px] h-[26px] rounded-[18px] center">
                    <p className="text-calender-main">{formatted}</p>
                  </div>
                ) : (
                  <p className="text-calendar-date">{formatted}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="w-full h-[500px] overflow-y-scroll flex scrollbar-hide">
        <div className="w-[96px] flex-shrink-0 flex flex-col items-center">
          {Array.from({ length: 16 }, (_, index) => index + 7).map(
            (hour, index) => {
              return (
                <div
                  key={`hour-${hour}`}
                  className={cn(
                    "flex flex-col items-end",
                    `${index === 0 ? "mt-[30px]" : ""}`
                  )}
                >
                  <div className="h-[35px]">
                    <p
                      className="text-calender-main text-[12px] font-semibold "
                      style={{ lineHeight: "10px" }}
                    >{`${hour}:00`}</p>
                  </div>
                  {Array.from({ length: 3 }, (_, index) => index).map(
                    (item) => {
                      return (
                        <div key={`minus-${item}`} className="h-[25px]">
                          <div className="w-[14px] h-[3px] rounded-[2px] bg-[rgba(216,216,216,0.8)]"></div>
                        </div>
                      );
                    }
                  )}
                </div>
              );
            }
          )}
        </div>
        <div className="flex-1 w-0 h-full flex flex-row">
          <div
            id="task-calendar-draggable"
            className=" relative h-[1800px] flex flex-row"
          >
            {dates.map((item, index) => {
              const isNow = dayjs().isSame(item.date, "day");
              return (
                <TaskCalendarRow key={`date-col-${index}`} isNow={isNow} />
              );
            })}
            <TaskCalendarCard />
          </div>
        </div>
      </div>
    </div>
  );
}
