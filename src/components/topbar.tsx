import { cn } from "@/lib/utils";
import Image from "next/image";
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
        <p className="text-content-secondary text-[20px] font-medium mr-[10px]">
          username
        </p>
        <div className="w-[34px] h-[34px] rounded-full overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YXZhdGFyfGVufDB8fDB8fHww"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
