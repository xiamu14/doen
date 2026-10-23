"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MonthCalendar from "@/components/ui/month-calendar";
import { getTasks } from "@/client/api/task";
import type { EventRecord } from "@/client/api/event";
import { completedMinutesByDate, slideDestination } from "@/lib/calendar-heatmap";

gsap.registerPlugin(Draggable);

type Props = {
  month: string;
  value: string;
  events: EventRecord[];
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
};

export default function CalendarPopoverContent(props: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const selectPageRef = useRef<(page: number) => void>(() => {});
  const suppressClickRef = useRef(false);
  const [page, setPage] = useState(0);
  const { data: tasks, isError } = useQuery({ queryKey: ["tasks"], queryFn: getTasks });
  const completedMinutes = useMemo(() => completedMinutesByDate(tasks ?? []), [tasks]);
  const month = dayjs(`${props.month}-01T00:00:00`);

  useEffect(() => {
    const viewport = viewportRef.current!;
    const track = trackRef.current!;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let currentPage = 0;
    let width = viewport.clientWidth;
    let wheelOffset = 0;
    let wheelActive = false;
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    let clickTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = (next: number, animate = true) => {
      currentPage = next;
      setPage(next);
      gsap.to(track, {
        x: -next * width,
        duration: animate && !reducedMotion.matches ? 0.55 : 0,
        ease: "elastic.out(1, 0.65)",
        overwrite: true,
        onUpdate: () => { draggable.update(); },
      });
    };
    const stopWheel = () => {
      clearTimeout(wheelTimer);
      wheelActive = false;
      wheelOffset = 0;
    };
    const draggable = Draggable.create(track, {
      trigger: viewport,
      type: "x",
      bounds: { minX: -width, maxX: 0 },
      edgeResistance: 0.8,
      dragClickables: true,
      minimumMovement: 5,
      zIndexBoost: false,
      onPress() {
        stopWheel();
        clearTimeout(clickTimer);
        suppressClickRef.current = false;
        gsap.killTweensOf(track);
        gsap.set(track, { x: -currentPage * width });
        this.update();
      },
      onDragStart() {
        suppressClickRef.current = true;
      },
      onDragEnd() {
        settle(slideDestination(currentPage, this.x + currentPage * width, width));
        // The pointer-up click must not select a date after a drag.
        clickTimer = setTimeout(() => { suppressClickRef.current = false; }, 0);
      },
    })[0];

    selectPageRef.current = (next) => {
      stopWheel();
      settle(next);
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || draggable.isPressed) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      if (!wheelActive) {
        gsap.killTweensOf(track);
        wheelOffset = 0;
        wheelActive = true;
      }
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? width : 1;
      wheelOffset = Math.max(-width, Math.min(width, wheelOffset - delta * unit));
      const x = -currentPage * width + wheelOffset;
      const resistedX = x > 0 ? x * 0.2 : x < -width ? -width + (x + width) * 0.2 : x;
      gsap.set(track, { x: resistedX });
      draggable.update();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        const next = slideDestination(currentPage, wheelOffset, width);
        stopWheel();
        settle(next);
      }, 160);
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    const resize = new ResizeObserver(() => {
      width = viewport.clientWidth;
      stopWheel();
      draggable.applyBounds({ minX: -width, maxX: 0 });
      settle(currentPage, false);
    });
    resize.observe(viewport);
    return () => {
      stopWheel();
      clearTimeout(clickTimer);
      resize.disconnect();
      viewport.removeEventListener("wheel", onWheel);
      draggable.kill();
      gsap.killTweensOf(track);
    };
  }, []);

  return <>
    <div className="mb-[15px] flex items-center justify-between">
      <button type="button" aria-label="Previous month" onClick={() => props.onMonthChange(month.subtract(1, "month").format("YYYY-MM"))} className="rounded p-1 hover:bg-[#f6f6f6]"><ChevronLeft size={22} /></button>
      <span className="text-[18px] font-semibold">{month.format("MMMM YYYY")}</span>
      <button type="button" aria-label="Next month" onClick={() => props.onMonthChange(month.add(1, "month").format("YYYY-MM"))} className="rounded p-1 hover:bg-[#f6f6f6]"><ChevronRight size={22} /></button>
    </div>
    <div className="grid grid-cols-7 text-center text-[17px] text-content-secondary">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => <span key={weekday} className="py-1">{weekday}</span>)}
    </div>
    <div ref={viewportRef} tabIndex={0} role="region" aria-label={`${page === 0 ? "Calendar" : "Heat map"}. Use left and right arrow keys to switch views.`} className="overflow-hidden focus-visible:outline-2 focus-visible:outline-primary" style={{ touchAction: "pan-y" }} onKeyDown={(event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        viewportRef.current?.focus();
        selectPageRef.current(event.key === "ArrowRight" ? 1 : 0);
      }
    }} onClickCapture={(event) => {
      if (suppressClickRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    }}>
      <div ref={trackRef} className="flex items-start">
        <div className="w-full shrink-0" inert={page !== 0} aria-hidden={page !== 0}>
          <MonthCalendar {...props} large hideHeader hideWeekdays />
        </div>
        <div className="w-full shrink-0" inert={page !== 1} aria-hidden={page !== 1}>
          {tasks ? <MonthCalendar {...props} large hideHeader hideWeekdays completedMinutes={completedMinutes} /> : <p role="status" className="p-4 text-center text-[14px]">{isError ? "Could not load completed durations." : "Loading completed durations…"}</p>}
        </div>
      </div>
    </div>
  </>;
}
