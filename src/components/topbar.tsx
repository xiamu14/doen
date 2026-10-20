import { cn } from "@/components/ui/utils";
import { Search } from "lucide-react";
import { ClassNameValue } from "tailwind-merge";
import UserMenu from "./google-calendar/user-menu";

export default function TopBar({ className }: { className?: ClassNameValue }) {
  return (
    <div
      className={cn(
        "flex-row flex w-full justify-between pl-[30px] pr-[20px]",
        className
      )}
    >
      <div className="flex justify-start items-baseline gap-[10px]">
        <div className="font-extrabold text-[32px] text-topbar-logo">Doen</div>
        <div className="text-[16px] font-medium text-content-secondary translate-y-[-2px]">
          personal task
        </div>
      </div>
      <div className="w-[236px] h-[28px] rounded-full bg-[#f6f6f6] flex px-[8px] gap-[8px] items-center opacity-0">
        <Search size={13} color="#8a8a8a" />
      </div>
      <UserMenu />
    </div>
  );
}
