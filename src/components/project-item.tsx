import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import { ClassNameValue } from "tailwind-merge";

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
}: React.ComponentProps<"div"> &
  VariantProps<typeof variants> & {
    item: { name: string; color: string };
    textColor?: string;
  }) {
  return (
    <div className={cn(variants({ tight }), className)}>
      <div
        className={cn("w-[12px] h-[6px] rounded-[3px]")}
        style={{ backgroundColor: item.color }}
      ></div>
      <p
        className={cn(
          "text-[16px] font-medium",
          //   `${index === 0 ? "text-content" : ""}`,
          className
        )}
      >
        {item.name}
      </p>
    </div>
  );
}
