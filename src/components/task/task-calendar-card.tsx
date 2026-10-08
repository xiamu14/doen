"use client";

import { DialogUtils } from "../Dialog";
import type { TaskRecord } from "@/client/api/task";
import dayjs from "dayjs";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { useEffect, useRef } from "react";
import { clampSlot, SLOT_COUNT, SLOT_HEIGHT, SLOT_MINUTES, slotFromStart, startFromSlot, taskModalX } from "./calendar-time";

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
  const durationSlots = task.duration / SLOT_MINUTES;

  useEffect(() => {
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
              onChange({ ...task, start });
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
        const slots = Math.max(1, Math.min(SLOT_COUNT - slotFromStart(task.start),
          durationSlots + Math.round((this.y - initialY) / SLOT_HEIGHT)));
        gsap.set(card, { height: slots * SLOT_HEIGHT });
      },
      onRelease() {
        main[0].enable();
        const duration = (card.offsetHeight / SLOT_HEIGHT) * SLOT_MINUTES;
        if (duration !== task.duration) onChange({ ...task, duration });
      },
    });
    return () => {
      gsap.killTweensOf(card);
      main[0].kill();
      resize[0].kill();
    };
  }, [task.start, task.duration, dayIndex]);

  return (
    <div
      ref={cardRef}
      className="absolute w-[120px] bg-[#FDF1E0] py-[2px] rounded-[6px] flex flex-col px-[10px] overflow-hidden cursor-pointer z-12"
      style={{ left: dayIndex * 150 + 15, top: slotFromStart(task.start) * SLOT_HEIGHT, height: durationSlots * SLOT_HEIGHT }}
      onClick={(event) => {
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        const column = event.currentTarget.parentElement!.querySelectorAll<HTMLElement>("[data-calendar-day]")[dayIndex];
        const columnRect = column.getBoundingClientRect();
        DialogUtils.show("taskModal", { x: taskModalX(columnRect.left, columnRect.right, window.innerWidth), y: rect.top - 10, task });
      }}
    >
      <p className="text-[12px] font-semibold text-[#96753B] truncate flex-shrink-0">{task.title}</p>
      <p className="text-[10px] mt-[2px] text-[#96753B] my-0">
        {dayjs(task.start).format("H:mm")} - {dayjs(task.start).add(task.duration, "minute").format("H:mm")}
      </p>
      <div ref={resizeRef} className="absolute left-0 bottom-0 w-full h-[10px] cursor-s-resize" />
    </div>
  );
}
