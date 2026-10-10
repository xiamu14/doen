"use client";

import type { EventRecord } from "@/client/api/event";
import { DialogUtils } from "@/components/Dialog";
import { FIRST_HOUR, LAST_HOUR, SLOT_HEIGHT, SLOT_MINUTES } from "./calendar-time";

export default function EventCalendarMarker({ event, date, dayIndex }: {
  event: EventRecord;
  date: string;
  dayIndex: number;
}) {
  if (event.recurrence === "someday" || !event.time) return null;
  const [hour, minute] = event.time.split(":").map(Number);
  const top = Math.min(((hour - FIRST_HOUR) * 60 + minute) * SLOT_HEIGHT / SLOT_MINUTES, ((LAST_HOUR - FIRST_HOUR) * 60 * SLOT_HEIGHT) / SLOT_MINUTES - 2);

  return (
    <button
      type="button"
      aria-label={`${event.title}, ${event.time}`}
      title={`${event.title} · ${event.time}`}
      className="absolute z-0 h-[8px] w-[150px] border-t border-dashed outline-none"
      style={{ left: dayIndex * 150, top, borderColor: event.color }}
      onClick={(click) => {
        click.stopPropagation();
        const rect = click.currentTarget.getBoundingClientRect();
        DialogUtils.show("eventModal", { x: rect.left, y: rect.top, event, date });
      }}
    />
  );
}
