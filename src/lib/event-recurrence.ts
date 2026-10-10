import dayjs from "dayjs";
import type { EventRecord } from "@/client/api/event";

function localDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addEventDays(value: string, days: number) {
  const date = localDate(value);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function eventOccursOn(event: EventRecord, date: string) {
  if (event.recurrence === "once" || event.recurrence === "someday") return date === event.date;
  const occurrenceDate = localDate(date);
  if (event.recurrence === "daily") return true;
  if (event.recurrence === "weekly") return occurrenceDate.getDay() === event.repeatDay;
  const lastDay = new Date(occurrenceDate.getFullYear(), occurrenceDate.getMonth() + 1, 0).getDate();
  return occurrenceDate.getDate() === Math.min(event.repeatDay ?? 1, lastDay);
}

export function nextEventOccurrence(event: EventRecord, now = new Date()) {
  const today = dayjs(now).format("YYYY-MM-DD");
  const currentTime = dayjs(now).format("HH:mm");
  if (event.recurrence === "someday") {
    return event.date && event.date >= today ? { date: event.date, time: null } : null;
  }
  if (event.recurrence === "once") {
    return Boolean(event.date && event.time && (event.date > today || (event.date === today && event.time >= currentTime)))
      ? { date: event.date, time: event.time }
      : null;
  }
  for (let offset = 0; offset <= 366; offset += 1) {
    const date = addEventDays(today, offset);
    if (eventOccursOn(event, date) && (date > today || (event.time && event.time >= currentTime))) {
      return { date, time: event.time };
    }
  }
  return null;
}
