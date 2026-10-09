"use client";

import * as Popover from "@radix-ui/react-popover";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import CustomInput from "@/components/custom-input";
import { createEvent, deleteEvent, updateEvent, type EventRecord, type EventRecurrence } from "@/client/api/event";
import { modalsState } from "./state";
import { DialogUtils } from "./utils";
import type { Modals } from "./type";
import { useSnapshot } from "valtio";

const repeatLabels: Record<EventRecurrence, string> = {
  once: "Once",
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
};
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function EventModal() {
  const modal = useSnapshot(modalsState);
  const queryClient = useQueryClient();
  const isOpen = modal.activeModalId === "eventModal";
  const data = modal.extraData as Modals["eventModal"];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<string | null>(() => dayjs().format("YYYY-MM-DD"));
  const [time, setTime] = useState("07:00");
  const [recurrence, setRecurrence] = useState<EventRecurrence>("once");
  const [repeatDay, setRepeatDay] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(dayjs().format("YYYY-MM"));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const currentEvent = data?.event;
  const firstOfMonth = dayjs(`${calendarMonth}-01T00:00:00`);
  const daysInMonth = firstOfMonth.daysInMonth();
  const dayCells = useMemo(() => [
    ...Array.from({ length: firstOfMonth.day() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ], [calendarMonth, daysInMonth, firstOfMonth]);

  const clearDefaultOnFocus = (event: React.FocusEvent<HTMLDivElement>, defaultValue: string, setValue: (value: string) => void) => {
    if (event.currentTarget.textContent !== defaultValue) return;
    event.currentTarget.textContent = "";
    setValue("");
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(event.currentTarget, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  useEffect(() => {
    if (!isOpen) return;
    const now = dayjs();
    const defaultTime = now.hour() < 7 ? "07:00" : now.hour() >= 23 ? "23:00" : now.format("HH:mm");
    setTitle(currentEvent?.title ?? "New Event");
    setDescription(currentEvent?.description ?? "about this event");
    const selectedDate = currentEvent?.date ?? data?.date ?? now.format("YYYY-MM-DD");
    setDate(currentEvent ? currentEvent.recurrence === "once" ? currentEvent.date ?? selectedDate : null : selectedDate);
    setTime(currentEvent?.time ?? defaultTime);
    setRecurrence(currentEvent?.recurrence ?? "once");
    setRepeatDay(currentEvent?.repeatDay ?? (currentEvent?.date
      ? currentEvent.recurrence === "weekly"
        ? new Date(`${currentEvent.date}T00:00:00`).getDay()
        : currentEvent.recurrence === "monthly" ? Number(currentEvent.date.slice(8, 10)) : null
      : currentEvent?.recurrence === "weekly" ? now.day()
        : currentEvent?.recurrence === "monthly" ? now.date() : null));
    setCalendarMonth(selectedDate.slice(0, 7));
    setCalendarOpen(false);
    setTimeOpen(false);
    setError("");
  }, [isOpen, currentEvent?.id, data?.date]);

  const close = () => DialogUtils.hide("eventModal");
  const save = async (submit: React.FormEvent<HTMLFormElement>) => {
    submit.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const values = { title: title.trim(), description: description.trim(), date, time, recurrence, repeatDay };
      const saved = currentEvent
        ? await updateEvent({ ...currentEvent, ...values })
        : await createEvent(values);
      queryClient.setQueryData<EventRecord[]>(["events"], (events = []) => currentEvent
        ? events.map((event) => event.id === saved.id ? saved : event)
        : [...events, saved]);
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save event.");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!currentEvent || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      await deleteEvent(currentEvent.id);
      queryClient.setQueryData<EventRecord[]>(["events"], (events = []) => events.filter((event) => event.id !== currentEvent.id));
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete event.");
    } finally {
      setIsSaving(false);
    }
  };

  const chooseDate = (day: number) => {
    setDate(`${calendarMonth}-${String(day).padStart(2, "0")}`);
    setCalendarOpen(false);
  };

  const changeRecurrence = (value: EventRecurrence) => {
    setRecurrence(value);
    if (value === "once") {
      setDate(date ?? dayjs().format("YYYY-MM-DD"));
      setRepeatDay(null);
      return;
    }
    setDate(null);
    if (value === "daily") {
      setRepeatDay(null);
      return;
    }
    const baseDate = date ?? dayjs().format("YYYY-MM-DD");
    const parsedDate = new Date(`${baseDate}T00:00:00`);
    setRepeatDay(value === "weekly" ? parsedDate.getDay() : parsedDate.getDate());
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <Popover.Anchor
        aria-hidden="true"
        style={{ position: "fixed", left: data?.x ?? 0, top: data?.y ?? 0, width: 1, height: 1 }}
      />
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[285px] max-w-[calc(100vw-32px)] rounded-[16px] border border-[#f1f1f1] bg-white p-5 shadow-modal outline-none"
        >
          <form onSubmit={save} className="flex flex-col gap-[14px]">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <CustomInput
                ariaLabel="Event title"
                singleLine
                value={title}
                onChange={(event) => setTitle((event.target as HTMLDivElement).textContent ?? "")}
                onFocus={(event) => clearDefaultOnFocus(event, "New Event", setTitle)}
                className="min-h-[22px] text-[18px] font-medium text-content"
              />
              <CustomInput
                ariaLabel="Event description"
                value={description}
                onChange={(event) => setDescription((event.target as HTMLDivElement).textContent ?? "")}
                onFocus={(event) => clearDefaultOnFocus(event, "about this event", setDescription)}
                className="min-h-[28px] rounded-[6px] px-[4px] py-[2px] text-[14px] font-medium text-content-description focus:bg-[#eee] focus:text-[#666]"
              />
            </div>
            <div className="flex items-center gap-[6px]">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button type="button" className="flex h-[34px] flex-shrink-0 items-center whitespace-nowrap rounded-[8px] bg-[#f6f6f6] px-2.5 text-[13px] text-content">{repeatLabels[recurrence]}</button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="start" sideOffset={6} className="z-[60] min-w-[160px] rounded-[10px] border border-[#eee] bg-white p-1 outline-none">
                    {(Object.keys(repeatLabels) as EventRecurrence[]).map((value) => (
                      <DropdownMenu.Item key={value} onSelect={() => changeRecurrence(value)} className={`cursor-pointer rounded px-3 py-2 text-[13px] text-content outline-none data-[highlighted]:bg-[#f6f6f6] ${recurrence === value ? "bg-primary text-white data-[highlighted]:bg-primary" : ""}`}>{repeatLabels[value]}</DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              {recurrence === "once" && <Popover.Root open={calendarOpen} onOpenChange={setCalendarOpen}>
                <Popover.Trigger asChild>
                  <button type="button" className="flex h-[34px] flex-shrink-0 items-center gap-1 rounded-[8px] bg-[#f6f6f6] px-2.5 text-[13px] text-content">
                    <CalendarDays size={14} />{dayjs(`${date}T00:00:00`).format("MMM D")}
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content side="bottom" align="start" sideOffset={6} className="z-[60] w-[260px] rounded-[12px] border border-[#eee] bg-white p-3 outline-none">
                    <div className="mb-3 flex items-center justify-between">
                      <button type="button" aria-label="Previous month" onClick={() => setCalendarMonth(firstOfMonth.subtract(1, "month").format("YYYY-MM"))} className="rounded p-1 hover:bg-[#f6f6f6]"><ChevronLeft size={16} /></button>
                      <span className="text-[14px] font-semibold text-content">{firstOfMonth.format("MMMM YYYY")}</span>
                      <button type="button" aria-label="Next month" onClick={() => setCalendarMonth(firstOfMonth.add(1, "month").format("YYYY-MM"))} className="rounded p-1 hover:bg-[#f6f6f6]"><ChevronRight size={16} /></button>
                    </div>
                    <div className="grid grid-cols-7 text-center text-[11px] text-content-secondary">
                      {["S", "M", "T", "W", "T", "F", "S"].map((weekday, index) => <span key={`${weekday}-${index}`} className="py-1">{weekday}</span>)}
                      {dayCells.map((day, index) => day ? (
                        <button key={day} type="button" onClick={() => chooseDate(day)} className={`h-8 rounded-full text-[12px] ${date === `${calendarMonth}-${String(day).padStart(2, "0")}` ? "bg-primary text-white" : "text-content hover:bg-[#f6f6f6]"}`}>{day}</button>
                      ) : <span key={`blank-${index}`} />)}
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>}
              {recurrence === "weekly" && <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild><button type="button" aria-label={`Every week on ${weekdays[repeatDay ?? 0]}`} className="h-[34px] whitespace-nowrap rounded-[8px] bg-[#f6f6f6] px-2.5 text-[13px] text-content">{weekdays[repeatDay ?? 0]}</button></DropdownMenu.Trigger>
                <DropdownMenu.Portal><DropdownMenu.Content align="start" sideOffset={6} className="z-[60] max-h-[220px] min-w-[150px] overflow-y-auto scrollbar-hide rounded-[10px] border border-[#eee] bg-white p-1 outline-none">
                  {weekdays.map((weekday, index) => <DropdownMenu.Item key={weekday} onSelect={() => setRepeatDay(index)} className="cursor-pointer rounded px-3 py-2 text-[13px] text-content outline-none data-[highlighted]:bg-[#f6f6f6]">{weekday}</DropdownMenu.Item>)}
                </DropdownMenu.Content></DropdownMenu.Portal>
              </DropdownMenu.Root>}
              {recurrence === "monthly" && <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild><button type="button" aria-label={`Day ${repeatDay ?? 1} of the month`} className="h-[34px] whitespace-nowrap rounded-[8px] bg-[#f6f6f6] px-2.5 text-[13px] text-content">Day {repeatDay ?? 1}</button></DropdownMenu.Trigger>
                <DropdownMenu.Portal><DropdownMenu.Content align="start" sideOffset={6} className="z-[60] max-h-[220px] min-w-[150px] overflow-y-auto scrollbar-hide rounded-[10px] border border-[#eee] bg-white p-1 outline-none">
                  {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <DropdownMenu.Item key={day} onSelect={() => setRepeatDay(day)} className="cursor-pointer rounded px-3 py-2 text-[13px] text-content outline-none data-[highlighted]:bg-[#f6f6f6]">Day {day}</DropdownMenu.Item>)}
                </DropdownMenu.Content></DropdownMenu.Portal>
              </DropdownMenu.Root>}
              <Popover.Root open={timeOpen} onOpenChange={setTimeOpen}>
                <Popover.Trigger asChild>
                  <button type="button" className="flex h-[34px] flex-shrink-0 items-center gap-1 rounded-[8px] bg-[#f6f6f6] px-2.5 text-[13px] text-content"><Clock3 size={14} />{time}</button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content side="bottom" align="start" sideOffset={6} className="z-[60] flex h-[220px] rounded-[12px] border border-[#eee] bg-white p-2 outline-none">
                    <div aria-label="Hour" className="h-full overflow-y-auto scrollbar-hide px-1">
                      {Array.from({ length: 17 }, (_, index) => index + 7).map((hour) => (
                        <button key={hour} type="button" onClick={() => setTime(`${String(hour).padStart(2, "0")}:${time.slice(3)}`)} className={`block w-12 rounded py-1 text-center text-[13px] ${time.slice(0, 2) === String(hour).padStart(2, "0") ? "bg-primary text-white" : "text-content hover:bg-[#f6f6f6]"}`}>{String(hour).padStart(2, "0")}</button>
                      ))}
                    </div>
                    <div aria-label="Minute" className="h-full overflow-y-auto border-l border-[#eee] px-1 scrollbar-hide">
                      {Array.from({ length: 60 }, (_, minute) => minute).map((minute) => (
                        <button key={minute} type="button" onClick={() => setTime(`${time.slice(0, 2)}:${String(minute).padStart(2, "0")}`)} className={`block w-12 rounded py-1 text-center text-[13px] ${time.slice(3) === String(minute).padStart(2, "0") ? "bg-primary text-white" : "text-content hover:bg-[#f6f6f6]"}`}>{String(minute).padStart(2, "0")}</button>
                      ))}
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            </div>
            {error && <p role="alert" className="text-[12px] text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              {currentEvent && <button type="button" disabled={isSaving} onClick={remove} className="h-[34px] flex-1 rounded-full border border-[#eee] text-[13px] font-medium text-red-600 disabled:opacity-50">Delete</button>}
              <button type="submit" disabled={isSaving || !title.trim()} className="h-[34px] flex-1 rounded-full bg-primary text-[13px] font-semibold text-white disabled:opacity-50">{isSaving ? "Saving..." : currentEvent ? "Apply" : "Create"}</button>
            </div>
          </form>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
