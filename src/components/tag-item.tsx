import { cn } from "@/components/ui/utils";
import { Select } from "@headlessui/react";
import { TASK_TAGS, type TaskTagName } from "@/lib/task-tags";

export default function TagItem({
  item,
  textColor,
  tight = false,
  isSelection = false,
  tagId,
  onTagChange,
}: {
  textColor?: string;
  tight?: boolean;
  item: { name: string; label?: string; color: string };
  isSelection?: boolean;
  tagId?: TaskTagName;
  onTagChange?: (id: TaskTagName) => void;
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
          value={tagId}
          onChange={(event) => onTagChange?.(event.target.value as TaskTagName)}
          className="text-[16px] font-medium focus:not-data-focus:outline-none data-focus:outline-2 appearance-none cursor-pointer"
          style={{ color: textColor }}
        >
          {TASK_TAGS.map((tag) => (
            <option key={tag.name} value={tag.name}>{tag.label}</option>
          ))}
        </Select>
      ) : (
        <p className="text-[16px] font-medium" style={{ color: textColor }}>
          {item.label ?? item.name}
        </p>
      )}
    </div>
  );
}
