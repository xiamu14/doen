import { cn } from "@/lib/utils";
import { Select } from "@headlessui/react";
import { ClassNameValue } from "tailwind-merge";

export default function TagItem({
  item,
  textColor,
  tight = false,
  isSelection = false,
}: {
  textColor?: string;
  tight?: boolean;
  item: { name: string; color: string };
  isSelection?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-start items-center gap-[16px] cursor-pointer",
        { "gap-[8px]": tight }
      )}
    >
      <div
        className={cn("w-[10px] h-[10px] rounded-full")}
        style={{ backgroundColor: item.color }}
      ></div>
      {isSelection ? (
        <Select
          className={
            "text-[16px] font-medium focus:not-data-focus:outline-none data-focus:outline-2 appearance-none cursor-pointer"
          }
          style={{ color: textColor }}
        >
          <option value="1">easy</option>
          <option value="2">difficult</option>
          <option value="3">pressing</option>
          <option value="4">later</option>
        </Select>
      ) : (
        <p className="text-[16px] font-medium" style={{ color: textColor }}>
          {item.name}
        </p>
      )}
    </div>
  );
}
