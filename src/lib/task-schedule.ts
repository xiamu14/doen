import { FIRST_HOUR, LAST_HOUR, MAX_TASK_DURATION, MIN_TASK_DURATION, SLOT_MINUTES } from "./task-schedule-config";

type ZonedParts = { date: string; time: string };

export function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function getZonedParts(value: string | Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

export function localTimeToISOString(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const actual = getZonedParts(new Date(timestamp), timeZone);
    const [actualYear, actualMonth, actualDay] = actual.date.split("-").map(Number);
    const [actualHour, actualMinute] = actual.time.split(":").map(Number);
    const represented = Date.UTC(actualYear, actualMonth - 1, actualDay, actualHour, actualMinute);
    const difference = target - represented;
    timestamp += difference;
    if (!difference) break;
  }
  const result = new Date(timestamp);
  if (getZonedParts(result, timeZone).date !== date || getZonedParts(result, timeZone).time !== time) {
    throw new Error("That local time does not exist.");
  }
  return result.toISOString();
}

export function isValidTaskWindow(start: string, duration: number, timeZone: string) {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime()) || !isTimeZone(timeZone)) return false;
  if (!Number.isInteger(duration) || duration < MIN_TASK_DURATION || duration > MAX_TASK_DURATION || duration % SLOT_MINUTES !== 0) return false;
  if (startDate.getUTCSeconds() !== 0 || startDate.getUTCMilliseconds() !== 0) return false;

  const startParts = getZonedParts(startDate, timeZone);
  const [startHour, startMinute] = startParts.time.split(":").map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endParts = getZonedParts(new Date(startDate.getTime() + duration * 60_000), timeZone);
  const [endHour, endMinute] = endParts.time.split(":").map(Number);
  const endMinutes = endHour * 60 + endMinute;

  return startParts.date === endParts.date &&
    startMinutes >= FIRST_HOUR * 60 &&
    startMinute % SLOT_MINUTES === 0 &&
    endMinutes <= LAST_HOUR * 60;
}
