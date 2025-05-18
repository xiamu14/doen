import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import { Select } from "@headlessui/react";

const variants = cva("flex justify-start items-center  cursor-pointer", {
  variants: {
    tight: {
      false: "gap-[16px]",
      true: "gap-[8px]",
    },
  },
  defaultVariants: {
    tight: false,
  },
});

export default function ProjectItem({
  item,
  className,
  tight,
  textColor = "",
  isSelection = false,
}: React.ComponentProps<"div"> &
  VariantProps<typeof variants> & {
    item: { name: string; color: string };
    textColor?: string;
    isSelection?: boolean;
  }) {
  return (
    <div className={cn("cursor-pointer", variants({ tight }), className)}>
      <div
        className={cn("w-[12px] h-[6px] rounded-[3px]")}
        style={{ backgroundColor: item.color }}
      ></div>
      {isSelection ? (
        <Select
          className={cn(
            "text-[16px] font-medium focus:not-data-focus:outline-none data-focus:outline-2 appearance-none cursor-pointer",
            //   `${index === 0 ? "text-content" : ""}`,
            className
          )}
          style={{ color: textColor }}
        >
          <option value="1">AiVideo</option>
          <option value="2">InBox</option>
        </Select>
      ) : (
        <p
          className={cn(
            "text-[16px] font-medium",
            //   `${index === 0 ? "text-content" : ""}`,
            className
          )}
          style={{ color: textColor }}
        >
          {item.name}
        </p>
      )}
    </div>
  );
}
