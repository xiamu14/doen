"use client";

import type { EventRecord } from "@/client/api/event";
import { FIRST_HOUR, LAST_HOUR, SLOT_HEIGHT, SLOT_MINUTES } from "./calendar-time";
import { eventHasTime } from "@/lib/event-recurrence";

export default function EventCalendarMarker({ event, dayIndex }: {
  event: EventRecord;
  dayIndex: number;
}) {
  if (!eventHasTime(event.recurrence) || !event.time) return null;
  const [hour, minute] = event.time.split(":").map(Number);
  const top = Math.min(((hour - FIRST_HOUR) * 60 + minute) * SLOT_HEIGHT / SLOT_MINUTES, ((LAST_HOUR - FIRST_HOUR) * 60 * SLOT_HEIGHT) / SLOT_MINUTES - 2);

  return (
    <div
      role="img"
      aria-label={`${event.title}, ${event.time}`}
      className="pointer-events-none absolute z-0 h-[8px] w-[150px] border-t border-dashed"
      style={{ left: dayIndex * 150, top, borderColor: event.color }}
    />
  );
}
