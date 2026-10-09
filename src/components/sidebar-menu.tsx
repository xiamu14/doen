"use client";

import { MouseEventHandler, useCallback } from "react";
import { DialogUtils } from "./Dialog";
import { ChevronDown, Folder, Milestone, Plus, Signpost, Tag } from "lucide-react";
import ProjectItem from "./project-item";
import TagItem from "./tag-item";
import { useQuery } from "@tanstack/react-query";
import { getList } from "@/client/api/task";
import { PROJECT_COLORS } from "@/lib/project-colors";
import { TASK_TAGS } from "@/lib/task-tags";
import { getEvents } from "@/client/api/event";
import { nextEventOccurrence } from "@/lib/event-recurrence";
import dayjs from "dayjs";

export function ListMenu() {
  const { data } = useQuery({ queryKey: ["list"], queryFn: getList });
  const handleProject: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();

      DialogUtils.show("projectModal", {
        x: rect.left,
        y: rect.bottom + 10,
        projectId: "",
        color:
          PROJECT_COLORS[
            (data?.data.project.length ?? 0) % PROJECT_COLORS.length
          ],
      });
    },
    [data?.data.project.length],
  );
  return (
    <div className="w-full flex flex-col gap-[10px]">
      <div className="w-full flex justify-start items-center gap-[20px]">
        <div className="flex justify-start items-center gap-[10px]">
          <ChevronDown
            size={18}
            color="#333"
            className="cursor-pointer mr-[2px]"
          />
          <Folder size={16} color="#333" />
          <p className="text-[18px] font-semibold text-content">Projects</p>
        </div>
        <div
          className="flex justify-start items-center gap-[4px] cursor-pointer"
          onClick={handleProject}
        >
          <Plus size={16} color="#7390FE" />
          <p className="text-create-list font-medium text-[14px]">new</p>
        </div>
      </div>
      <div className="h-[88px] flex-shrink-0 overflow-y-auto scrollbar-hide pl-[30px] flex flex-col items-start gap-[8px] text-content-secondary">
        {data?.data.project.map(
          (
            item: { id: string; name: string; color: string },
            index: number,
          ) => {
            return (
              <button
                type="button"
                key={item.id}
                className="text-left"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  DialogUtils.show("projectModal", {
                    projectId: item.id,
                    name: item.name,
                    color: item.color,
                    x: rect.left,
                    y: rect.bottom + 10,
                  });
                }}
              >
                <ProjectItem item={item} className={"text-content"} />
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

export function TagMenu() {
  return (
    <div className="w-full flex flex-col gap-[14px]">
      <div className="w-full flex justify-start items-center gap-[20px]">
        <div className="flex justify-start items-center gap-[10px]">
          <ChevronDown
            size={18}
            color="#333"
            className="cursor-pointer mr-[2px]"
          />
          <Tag size={16} color="#333" />
          <p className="text-[18px] font-semibold text-content">Tags</p>
        </div>
        <div className=" justify-start items-center gap-[4px] cursor-pointer hidden">
          <Plus size={16} color="#7390FE" />

          <p className="text-create-list font-medium text-[14px]">new</p>
        </div>
      </div>
      <div className="pl-[30px] flex flex-col  items-start gap-[8px] text-content-secondary">
        {TASK_TAGS.map((item) => {
          return <TagItem key={item.name} item={item} />;
        })}
      </div>
    </div>
  );
}

export function EventList() {
  const { data: events = [] } = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const upcoming = events
    .map((event) => ({ event, next: nextEventOccurrence(event) }))
    .filter((item) => item.next)
    .sort((a, b) => `${a.next!.date} ${a.next!.time}`.localeCompare(`${b.next!.date} ${b.next!.time}`));

  return (
    <div className="w-full flex flex-col gap-[14px]">
      <div className="w-full flex justify-start items-center gap-[20px]">
        <div className="flex justify-start items-center gap-[10px]">
          <ChevronDown
            size={18}
            color="#333"
            className="cursor-pointer mr-[2px]"
          />
          <Milestone size={18} color="#333" />
          <p className="text-[18px] font-semibold text-content">Events</p>
        </div>
        <button type="button" className="flex justify-start items-center gap-[4px] cursor-pointer" onClick={(click) => {
          const rect = click.currentTarget.getBoundingClientRect();
          DialogUtils.show("eventModal", { x: rect.left, y: rect.bottom + 8 });
        }}>
          <Plus size={16} color="#7390FE" />
          <p className="text-create-list font-medium text-[14px]">new</p>
        </button>
      </div>
      <div className="h-[138px] flex-shrink-0 overflow-y-auto scrollbar-hide pl-[30px] flex flex-col items-start gap-[8px] text-content-secondary">
        {upcoming.map(({ event, next }) => (
          <button
            type="button"
            key={event.id}
            className="w-full text-left flex flex-col items-start"
            onClick={(click) => {
              const rect = click.currentTarget.getBoundingClientRect();
              DialogUtils.show("eventModal", { x: rect.left, y: rect.bottom + 8, event });
            }}
          >
            <span className="flex items-center gap-[8px] text-[15px] font-medium text-content truncate max-w-full">
              <span className="size-[10px] flex-shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
              <span className="ml-[10px] truncate">{event.title}</span>
            </span>
            <span className="ml-[28px] text-[12px] text-content-secondary">
              {event.recurrence === "once"
                ? dayjs(`${next!.date}T${next!.time}`).format("MMM D · HH:mm")
                : event.recurrence === "daily"
                  ? `Every day · ${event.time}`
                  : event.recurrence === "weekly"
                    ? `Every ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][event.repeatDay ?? 0]} · ${event.time}`
                    : `Day ${event.repeatDay ?? 1} each month · ${event.time}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
