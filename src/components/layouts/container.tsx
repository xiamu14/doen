import { cn } from "@/components/ui/utils";
import { ClassNameValue } from "tailwind-merge";
import TopBar from "../topbar";
import Sidebar from "../sidebar";
import TaskPanel from "../task/task-panel";

export default function Container({
  className,
}: {
  className: ClassNameValue;
}) {
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
