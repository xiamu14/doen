"use client";

import { useQuery } from "@tanstack/react-query";
import { getTasks } from "@/client/api/task";
import { EventList, ListMenu, TagMenu } from "./sidebar-menu";

export default function Sidebar() {
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: getTasks });

  return (
    <div className="w-[220px] flex flex-col">
      <div className="w-full pl-[30px] flex justify-start items-center gap-[12px] mb-[20px]">
        <p className="font-semibold text-[22px] text-content">Tasks{tasks && ` (${tasks.filter((task) => task.status !== "done").length})`}</p>
      </div>
      <ListMenu />
      <div className="h-[20px]" />
      <EventList />
    </div>
  );
}
