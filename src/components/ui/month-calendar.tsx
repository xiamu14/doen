import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EventRecord } from "@/client/api/event";

type Props = {
  month: string;
  value?: string | null;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
  events?: EventRecord[];
};

export default function MonthCalendar({ month, value, onMonthChange, onSelect, events = [] }: Props) {
  const firstOfMonth = dayjs(`${month}-01T00:00:00`);
  const days = [
    ...Array.from({ length: firstOfMonth.day() }, () => null),
    ...Array.from({ length: firstOfMonth.daysInMonth() }, (_, index) => index + 1),
  ];

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => onMonthChange(firstOfMonth.subtract(1, "month").format("YYYY-MM"))} className="rounded p-1 hover:bg-[#f6f6f6]"><ChevronLeft size={18} /></button>
        <span className="text-[15px] font-semibold text-content">{firstOfMonth.format("MMMM YYYY")}</span>
        <button type="button" aria-label="Next month" onClick={() => onMonthChange(firstOfMonth.add(1, "month").format("YYYY-MM"))} className="rounded p-1 hover:bg-[#f6f6f6]"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[12px] text-content-secondary">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday, index) => <span key={`${weekday}-${index}`} className="py-1 text-[14px]">{weekday}</span>)}
        {days.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const isSelected = value === date;
          const isToday = dayjs().format("YYYY-MM-DD") === date;
          const someDayEvent = events.find((event) => event.recurrence === "someday" && event.date === date);
          return <button key={day} type="button" onClick={() => onSelect(date)} className={`h-9 rounded-full text-[14px] ${isSelected ? "bg-primary text-white" : isToday ? "font-bold text-[#f05252] hover:bg-[#f6f6f6]" : someDayEvent ? "font-bold hover:bg-[#f6f6f6]" : "text-content hover:bg-[#f6f6f6]"}`} style={!isSelected && !isToday && someDayEvent ? { color: someDayEvent.color } : undefined}>{day}</button>;
        })}
      </div>
    </>
  );
}
