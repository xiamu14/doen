import { cn } from "@/components/ui/utils";
import { Select } from "@headlessui/react";

export default function ProjectSelect() {
  return (
    <div className="relative">
      <Select
        className={cn(
          "block w-full appearance-none rounded-lg border-none bg-white/5 px-3 py-1.5 text-sm/6",
          "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25",
          // Make the text of each option black on Windows
          "*:text-content"
        )}
      >
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="delayed">Delayed</option>
        <option value="canceled">Canceled</option>
      </Select>
    </div>
  );
}
