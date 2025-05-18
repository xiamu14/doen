import { cn } from "@/lib/utils";
import { ClassNameValue } from "tailwind-merge";

export default function TagItem({
  item,
  textColor,
  tight = false,
}: {
  textColor?: string;
  tight?: boolean;
  item: { name: string; color: string };
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
      <p className="text-[16px] font-medium">{item.name}</p>
    </div>
  );
}
