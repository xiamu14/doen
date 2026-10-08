"use client";

import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getList, getTasks, updateTask, type TaskRecord } from "@/client/api/task";
import { useSnapshot } from "valtio";
import { DialogUtils } from "../Dialog";
import { modalsState } from "../Dialog/state";
import TaskCalendarRow from "./task-calendar-row";
import TaskCalendarCard from "./task-calendar-card";
import { SLOT_HEIGHT, slotFromStart } from "./calendar-time";

export default function TaskCalendar() {
  const queryClient = useQueryClient();
  const pendingSaves = useRef(new Map<string, Promise<void>>());
  const modal = useSnapshot(modalsState);
  const [draftTask, setDraftTask] = useState<TaskRecord | null>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const syncHorizontalScroll = (source: "header" | "body", scrollLeft: number) => {
    const target = source === "header" ? bodyScrollRef.current : headerScrollRef.current;
    if (target && target.scrollLeft !== scrollLeft) target.scrollLeft = scrollLeft;
  };
  const scrollToCurrentTime = () => {
    const scroll = calendarScrollRef.current;
    if (!scroll) return;
    const currentTop = slotFromStart(new Date().toISOString()) * SLOT_HEIGHT;
    const centeredTop = currentTop - (scroll.clientHeight - SLOT_HEIGHT) / 2;
    const maxTop = scroll.scrollHeight - scroll.clientHeight;
    scroll.scrollTo({
      top: Math.max(0, Math.min(centeredTop, maxTop)),
      behavior: "smooth",
    });
  };
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: getTasks });
  const { data: list } = useQuery({ queryKey: ["list"], queryFn: getList });
  useEffect(() => {
    if (modal.activeModalId !== "taskModal") setDraftTask(null);
  }, [modal.activeModalId]);
  const openDraftTask = (start: string, x: number, y: number, top: number, bottom: number) => {
    setDraftTask({
      id: `draft-${Date.now()}`,
      title: "New Task",
      content: "about this task",
      start,
      duration: 30,
      status: "idle",
      projectId: list?.data.project[0]?.id ?? null,
      tagId: "easy",
    });
    DialogUtils.show("taskModal", { x, y, top, bottom, start });
  };
  const savePosition = (updated: TaskRecord) => {
    queryClient.setQueryData<TaskRecord[]>(["tasks"], (current) =>
      current?.map((item) => item.id === updated.id ? updated : item));
    const previousSave = pendingSaves.current.get(updated.id) ?? Promise.resolve();
    const save = previousSave.catch(() => {}).then(() => updateTask(updated)).then(() => {}).catch(async () => {
      if (pendingSaves.current.get(updated.id) === save) {
        await queryClient.invalidateQueries({ queryKey: ["tasks"] });
        window.alert("Could not save task position.");
      }
    });
    pendingSaves.current.set(updated.id, save);
  };
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
          {dayjs().format("MMMM")}
        </div>
        <div
          ref={headerScrollRef}
          className="flex-1 w-0 overflow-x-auto scrollbar-hide"
          onScroll={(event) => syncHorizontalScroll("header", event.currentTarget.scrollLeft)}
        >
          <div className="flex w-[1050px] min-w-full flex-row items-center">
            {dates.map((item, index) => {
              const dateFn = dayjs(item.date);
              const isNow = dayjs().isSame(dateFn, "day");
              const formatted = dateFn.format("ddd D");
              return (
                <div
                  key={`date-${index}`}
                  className={"w-[150px] flex-shrink-0 h-full center font-semibold text-[14px] "}
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
      </div>
      <div ref={calendarScrollRef} className="w-full h-[500px] mt-5 overflow-y-scroll flex scrollbar-hide">
        <div
          className="w-[96px] flex-shrink-0 flex flex-col items-center"
          onDoubleClick={scrollToCurrentTime}
        >
          {Array.from({ length: 16 }, (_, index) => index + 7).map(
            (hour, index) => {
              return (
                <div key={`hour-${hour}`} className="flex flex-col items-end">
                  <div className="h-[25px]">
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
        <div
          ref={bodyScrollRef}
          className="flex-1 w-0 h-[1600px] overflow-x-auto scrollbar-hide"
          onScroll={(event) => syncHorizontalScroll("body", event.currentTarget.scrollLeft)}
        >
          <div className="w-[1050px] min-w-full h-[1600px]">
            <div
              id="task-calendar-draggable"
              className="relative h-full w-[1050px] flex flex-row"
            >
            {dates.map((item, index) => {
              const isNow = dayjs().isSame(item.date, "day");
              return (
                <TaskCalendarRow
                  key={`date-col-${index}`}
                  isNow={isNow}
                  date={item.date}
                  tasks={tasks.filter((task) => dayjs(task.start).format("YYYY-MM-DD") === item.date)}
                  onCreateTask={openDraftTask}
                />
              );
            })}
            {tasks.map((task) => {
              const dayIndex = dates.findIndex((day) => day.date === dayjs(task.start).format("YYYY-MM-DD"));
              if (dayIndex < 0) return null;
              return <TaskCalendarCard
                key={task.id}
                task={task}
                dates={dates.map((day) => day.date)}
                dayIndex={dayIndex}
                onChange={savePosition}
              />;
            })}
            {draftTask && (
              <TaskCalendarCard
                key={draftTask.id}
                task={draftTask}
                dates={dates.map((day) => day.date)}
                dayIndex={dates.findIndex((day) => day.date === dayjs(draftTask.start).format("YYYY-MM-DD"))}
                onChange={setDraftTask}
              />
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
