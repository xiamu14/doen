import { cn } from "@/lib/utils";
import { ClassNameValue } from "tailwind-merge";

export default function TopBar({ className }: { className?: ClassNameValue }) {
  return (
    <div
      className={cn(
        "flex-row flex w-full justify-between pl-[30px]",
        className
      )}
    >
      <div className="font-extrabold text-[32px] text-topbar-logo">Doen</div>
      <div className="flex items-center justify-end">
        <p>username</p>
      </div>
    </div>
  );
}
