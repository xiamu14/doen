import { cn } from "@/lib/utils";
import { ClassNameValue } from "tailwind-merge";
import TopBar from "../topbar";
import Sidebar from "../sidebar";
import TaskPanel from "../task-panel";

export default function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className: ClassNameValue;
}) {
  return (
    <div className="flex justify-center items-center pt-[136px]">
      <div
        className={cn(
          "flex flex-col max-w-[1068px] w-[1068px] max-h-[764px]",
          className
        )}
      >
        <TopBar className="mb-[68px]"></TopBar>
        <div className="w-full flex flex-row justify-between items-center mb-[44px]">
          <Sidebar />
          <TaskPanel />
        </div>
      </div>
    </div>
  );
}
