"use client";

import { DialogUtils } from "../Dialog";
import type { TaskRecord } from "@/client/api/task";
import dayjs from "dayjs";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { useEffect, useRef } from "react";
import { clampSlot, SLOT_COUNT, SLOT_HEIGHT, SLOT_MINUTES, slotFromStart, startFromSlot, taskModalX } from "./calendar-time";
import { TASK_TAGS } from "@/lib/task-tags";

gsap.registerPlugin(Draggable);

type Props = {
  task: TaskRecord;
  dates: string[];
  dayIndex: number;
  onChange: (task: TaskRecord) => void;
};

export default function TaskCalendarCard({ task, dates, dayIndex, onChange }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const taskRef = useRef(task);
  taskRef.current = task;
  const durationSlots = task.duration / SLOT_MINUTES;
  const tag = TASK_TAGS.find((tag) => tag.name === (task.tagId ?? "easy|pressing")) ?? TASK_TAGS[0];
  const minDurationSlots = 2;
  const maxDurationSlots = 4;
  const isDone = task.status === "done";
  const isOverdue = dayjs(task.start).add(task.duration, "minute").isBefore(dayjs());

  useEffect(() => {
    if (task.status === "done") return;
    const card = cardRef.current!;
    const columns = Array.from(card.parentElement!.querySelectorAll<HTMLElement>("[data-calendar-day]"));
    const columnFor = (x: number) => {
      const center = card.offsetLeft + x + card.offsetWidth / 2;
      return columns.find((column) => center < column.offsetLeft + column.offsetWidth)
        ?? columns[columns.length - 1];
    };
    const main = Draggable.create(card, {
      bounds: card.parentElement,
      autoScroll: 1,
      edgeResistance: 0,
      zIndexBoost: false,
      type: "x,y",
      liveSnap: {
        x: (x) => {
          const column = columnFor(x);
          const min = column.offsetLeft - card.offsetLeft;
          return Math.max(min, Math.min(x, min + column.offsetWidth - card.offsetWidth));
        },
        y: (y) => clampSlot((card.offsetTop + y) / SLOT_HEIGHT, durationSlots) * SLOT_HEIGHT - card.offsetTop,
      },
      onPress() {
        gsap.killTweensOf(card);
        this.update();
      },
      onDragEnd() {
        const column = columnFor(this.x);
        const slot = clampSlot((card.offsetTop + this.y) / SLOT_HEIGHT, durationSlots);
        const left = column.offsetLeft + (column.offsetWidth - card.offsetWidth) / 2;
        const top = slot * SLOT_HEIGHT;
        const start = startFromSlot(dates[columns.indexOf(column)], slot);
        gsap.to(card, {
          x: left - card.offsetLeft,
          y: top - card.offsetTop,
          duration: 0.5,
          ease: "elastic.out(1, 0.5)",
          onComplete: () => {
            gsap.set(card, { left, top, x: 0, y: 0 });
            if (new Date(start).getTime() !== new Date(task.start).getTime()) {
              onChange({ ...taskRef.current, start });
            }
            main[0].update();
          },
        });
      },
    });

    const resizeTarget = document.createElement("div");
    let initialY = 0;
    const resize = Draggable.create(resizeTarget, {
      trigger: resizeRef.current,
      type: "y",
      cursor: "s-resize",
      onPress() {
        initialY = this.y;
        main[0].disable();
      },
      onDrag() {
        const remainingSlots = SLOT_COUNT - slotFromStart(task.start);
        const maxSlots = Math.min(maxDurationSlots, remainingSlots);
        const minSlots = Math.min(minDurationSlots, maxSlots);
        const slots = Math.max(minSlots, Math.min(maxSlots,
          durationSlots + Math.round((this.y - initialY) / SLOT_HEIGHT)));
        gsap.set(card, { height: slots * SLOT_HEIGHT - 2 });
      },
      onRelease() {
        main[0].enable();
        const duration = ((card.offsetHeight + 2) / SLOT_HEIGHT) * SLOT_MINUTES;
        if (duration !== taskRef.current.duration) onChange({ ...taskRef.current, duration });
      },
    });
    return () => {
      gsap.killTweensOf(card);
      main[0].kill();
      resize[0].kill();
    };
  }, [task.start, task.duration, task.status, dayIndex]);

  return (
    <div
      ref={cardRef}
      className={`absolute w-[120px] py-[3px] rounded-[6px] flex flex-col px-[10px] overflow-hidden z-12 ${task.status === "done" ? "cursor-default" : "cursor-pointer"}`}
      style={{ left: dayIndex * 150 + 15, top: slotFromStart(task.start) * SLOT_HEIGHT, height: durationSlots * SLOT_HEIGHT - 2, backgroundColor: isDone ? "#ddd" : isOverdue ? "#eee" : tag.backgroundColor }}
      onClick={(event) => {
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        const column = event.currentTarget.parentElement!.querySelectorAll<HTMLElement>("[data-calendar-day]")[dayIndex];
        const columnRect = column.getBoundingClientRect();
        DialogUtils.show("taskModal", {
          x: taskModalX(columnRect.left, columnRect.right, window.innerWidth),
          y: event.clientY,
          top: rect.top,
          bottom: rect.bottom,
          task,
        });
      }}
    >
      <p className="text-[14px] font-semibold truncate flex-shrink-0" style={{ color: isDone ? "#999" : isOverdue ? "oklch(70.4% 0.191 22.216)" : tag.name === "easy|pressing" ? "lab(66.9756% -58.27 19.5419)" : tag.color }}>{task.title}</p>
      <p className="text-[12px] mt-[2px] my-0" style={{ color: isDone ? "#999" : isOverdue ? "oklch(70.4% 0.191 22.216)" : tag.name === "easy|pressing" ? "lab(66.9756% -58.27 19.5419)" : tag.color }}>
        {dayjs(task.start).format("H:mm")} - {dayjs(task.start).add(task.duration, "minute").format("H:mm")}
      </p>
      <div ref={resizeRef} className="absolute left-0 bottom-0 w-full h-[10px] cursor-s-resize" />
    </div>
  );
}
