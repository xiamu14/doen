import type { EventRecord } from "@/client/api/event";
import type { TaskRecord } from "@/client/api/task";
import { addEventDays, eventOccursOn } from "@/lib/event-recurrence";
import { getZonedParts, localTimeToISOString } from "@/lib/task-schedule";
import { CALENDAR_TIME_ZONE } from "./config";

export type CalendarEvent = {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  transparency: "opaque" | "transparent";
  recurrence: string[];
  extendedProperties: { private: { doenKey: string } };
};
export type PlannedEntry = { variant: string; body: CalendarEvent };
export type SourceKind = "task" | "event";

function entry(key: string, title: string, description: string, at: string, duration: number, busy = false): CalendarEvent {
  return {
    summary: title, description,
    start: { dateTime: new Date(at).toISOString(), timeZone: CALENDAR_TIME_ZONE },
    end: { dateTime: new Date(Date.parse(at) + duration * 60_000).toISOString(), timeZone: CALENDAR_TIME_ZONE },
    transparency: busy ? "opaque" : "transparent",
    recurrence: [], extendedProperties: { private: { doenKey: key } },
  };
}

export function planTask(task: TaskRecord, now: number, existing = false): PlannedEntry[] {
  const start = Date.parse(task.start);
  const active = task.status !== "done";
  if (!Number.isFinite(start) || (!existing && (start + task.duration * 60_000 <= now || (!active && start <= now)))) return [];
  const entries: PlannedEntry[] = [{ variant: "main", body: entry(`task:${task.id}:main`, task.title, task.content,
    task.start, task.duration, true) }];
  const endingAt = start + (task.duration - 5) * 60_000;
  if (active && endingAt > now) entries.push({ variant: "ending", body: entry(`task:${task.id}:ending`,
    `即将结束：${task.title}`, task.content, new Date(endingAt).toISOString(), 1) });
  return entries;
}

export function planEvent(event: EventRecord, now: number, previous?: CalendarEvent): PlannedEntry[] {
  if (event.recurrence === "daily") return [];
  const time = event.recurrence === "once" ? event.time : "08:00";
  if (!time) return [];
  const recurring = event.recurrence === "weekly" || event.recurrence === "monthly";
  let date = event.date;
  if (recurring) {
    const today = getZonedParts(new Date(now), CALENDAR_TIME_ZONE).date;
    date = null;
    for (let offset = 0; offset <= 366; offset++) {
      const candidate = addEventDays(today, offset);
      if (eventOccursOn(event, candidate) && Date.parse(localTimeToISOString(candidate, time, CALENDAR_TIME_ZONE)) > now) {
        date = candidate;
        break;
      }
    }
  }
  if (!date) return [];
  let at = localTimeToISOString(date, time, CALENDAR_TIME_ZONE);
  if (!recurring && Date.parse(at) <= now && !previous) return [];
  const monthDay = event.repeatDay ?? 1;
  // Choosing the last available candidate preserves Doen's short-month rule.
  const monthDays = monthDay <= 28 ? String(monthDay) : Array.from({ length: monthDay - 27 }, (_, i) => 28 + i).join(",");
  const rule = event.recurrence === "weekly"
    ? `RRULE:FREQ=WEEKLY;BYDAY=${["SU", "MO", "TU", "WE", "TH", "FR", "SA"][event.repeatDay ?? 0]}`
    : event.recurrence === "monthly"
      ? `RRULE:FREQ=MONTHLY;BYMONTHDAY=${monthDays};BYSETPOS=-1`
      : null;
  // Keep the series anchor so later syncs preserve already-created occurrences.
  if (rule && previous?.recurrence[0] === rule) at = previous.start.dateTime;
  const body = entry(`event:${event.id}:main`, event.title, event.description, at, 1);
  if (rule) body.recurrence = [rule];
  return [{ variant: "main", body }];
}
