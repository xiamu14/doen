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
      <div className="pl-[30px] flex flex-col items-start gap-[8px] text-content-secondary">
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
    <div className="w-full flex flex-col gap-[20px]">
      <div className="w-full flex justify-start items-center gap-[20px]">
        <div className="flex justify-start items-center gap-[10px]">
          <ChevronDown
            size={18}
            color="#333"
            className="cursor-pointer mr-[2px]"
          />
          <Tag size={16} color="#333" />
          <p className="text-[18px] font-semibold text-content">Tag</p>
        </div>
        <div className="flex justify-start items-center gap-[4px] cursor-pointer">
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
        <div className="flex justify-start items-center gap-[4px] cursor-pointer">
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
