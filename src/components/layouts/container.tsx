"use client";

import { cn } from "@/components/ui/utils";
import { ClassNameValue } from "tailwind-merge";
import TopBar from "../topbar";
import Sidebar from "../sidebar";
import TaskPanel from "../task/task-panel";
import { useQuery } from "@tanstack/react-query";
import { getList } from "@/client/api/task";
import { useEffect } from "react";
import { orpcClient } from "@/lib/orpc/client";

export default function Container({
  className,
}: {
  className: ClassNameValue;
}) {
  const list = useQuery({
    queryKey: ["list"],
    queryFn: getList,
  });

  useEffect(() => {
    if (list.isFetched) {
      console.log(list.data);
    }
    orpcClient.hello({ name: "world" }).then((res) => {
      console.log(
        "%c res",
        "background: #69c0ff; color: white; padding: 4px",
        res
      );
    });
  }, [list]);

  return (
    <div className="flex justify-center items-center pt-[32px]">
      <div
        className={cn(
          "flex flex-col max-w-[1290px] w-[1290px] max-h-[764px]",
          className
        )}
      >
        <TopBar className="mb-[56px]"></TopBar>
        <div className="w-full flex flex-row justify-start mb-[44px] flex-grow-0 px-[48px] select-none">
          <Sidebar />
          <TaskPanel />
        </div>
      </div>
    </div>
  );
}
