import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { heatmapColor } from "@/lib/calendar-heatmap";
import type { EventRecord } from "@/client/api/event";

type Props = {
  month: string;
  value?: string | null;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
  events?: EventRecord[];
  large?: boolean;
  hideHeader?: boolean;
  hideWeekdays?: boolean;
  completedMinutes?: Record<string, number>;
};

export default function MonthCalendar({ month, value, onMonthChange, onSelect, events = [], large = false, hideHeader = false, hideWeekdays = false, completedMinutes }: Props) {
  const firstOfMonth = dayjs(`${month}-01T00:00:00`);
  const days = [
    ...Array.from({ length: firstOfMonth.day() }, () => null),
    ...Array.from({ length: firstOfMonth.daysInMonth() }, (_, index) => index + 1),
  ];

  return (
    <>
      {!hideHeader && <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => onMonthChange(firstOfMonth.subtract(1, "month").format("YYYY-MM"))} className="rounded p-1 hover:bg-[#f6f6f6]"><ChevronLeft size={18} /></button>
        <span className="text-[15px] font-semibold text-content">{firstOfMonth.format("MMMM YYYY")}</span>
        <button type="button" aria-label="Next month" onClick={() => onMonthChange(firstOfMonth.add(1, "month").format("YYYY-MM"))} className="rounded p-1 hover:bg-[#f6f6f6]"><ChevronRight size={18} /></button>
      </div>}
      <div className={`grid grid-cols-7 text-center text-[12px] text-content-secondary ${large && hideWeekdays ? "auto-rows-[45px]" : ""}`}>
        {!hideWeekdays && ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((weekday, index) => <span key={`${weekday}-${index}`} className="mb-[5px] rounded-[20px] py-1 text-[14px] font-semibold">{weekday}</span>)}
        {days.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const isSelected = value === date;
          if (completedMinutes) {
            const minutes = completedMinutes[date] ?? 0;
            const label = `${date}: ${Math.floor(minutes / 60)}h ${minutes % 60}m completed (${Math.round(minutes / 960 * 100)}%)`;
            return <button key={day} type="button" aria-label={label} aria-pressed={isSelected} title={label} onClick={() => onSelect(date)} className="flex h-[45px] items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-primary">
              <span className="block aspect-square w-[50%] max-w-[25.5px] rounded-full" style={{ backgroundColor: heatmapColor(minutes) }} />
            </button>;
          }
          const isToday = dayjs().format("YYYY-MM-DD") === date;
          const someDayEvent = events.find((event) => event.recurrence === "someday" && event.date === date);
          return <button key={day} type="button" onClick={() => onSelect(date)} className={`${large ? "aspect-square w-full max-w-[45px] self-center justify-self-center text-[17px] border-4 border-white" : "h-9 text-[14px]"} rounded-full ${isSelected ? "bg-primary text-white" : isToday ? "font-bold text-primary hover:bg-[#f6f6f6]" : someDayEvent ? "font-bold hover:bg-[#f6f6f6]" : "text-content hover:bg-[#f6f6f6]"}`} style={!isSelected && !isToday && someDayEvent ? { color: someDayEvent.color } : undefined}>{day}</button>;
        })}
      </div>
    </>
  );
}
