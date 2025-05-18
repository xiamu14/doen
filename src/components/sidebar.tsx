import { cn } from "@/lib/utils";
import { ChevronDown, Folder, Plus, Tag } from "lucide-react";
import ProjectItem from "./project-item";
import TagItem from "./tag-item";

export default function Sidebar() {
  return (
    <div className="w-[250px] flex flex-col">
      <div className="w-full pl-[30px] flex justify-start items-center gap-[12px] mb-[44px]">
        <p className="font-semibold text-[22px] text-content">Tasks</p>
        <p className="text-[16px] text-content">22</p>
      </div>
      <ListMenu />
      <div className="h-[48px]" />
      <TagMenu />
    </div>
  );
}

function ListMenu() {
  return (
    <div className="w-full flex flex-col gap-[24px]">
      <div className="w-full flex justify-start items-center gap-[24px]">
        <div className="flex justify-start items-center gap-[10px]">
          <ChevronDown
            size={18}
            color="#333"
            className="cursor-pointer mr-[2px]"
          />
          <Folder size={18} color="#333" />
          <p className="text-[18px] font-semibold text-content">List</p>
        </div>
        <div className="flex justify-start items-center gap-[4px] cursor-pointer">
          <Plus size={18} color="#7390FE" />
          <p className="text-create-list font-medium text-[14px]">new</p>
        </div>
      </div>
      <div className="pl-[30px] flex flex-col  items-start gap-[16px] text-content-secondary">
        {[
          { color: "#F2BB59", name: "Inbox" },
          { color: "#F05252", name: "AiVideo" },
        ].map((item, index) => {
          return (
            <ProjectItem
              item={item}
              key={item.name}
              className={`${index === 0 ? "text-content" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function TagMenu() {
  return (
    <div className="w-full flex flex-col gap-[24px]">
      <div className="w-full flex justify-start items-center gap-[24px]">
        <div className="flex justify-start items-center gap-[10px]">
          <ChevronDown
            size={18}
            color="#333"
            className="cursor-pointer mr-[2px]"
          />
          <Tag size={18} color="#333" />
          <p className="text-[18px] font-semibold text-content">Tag</p>
        </div>
        <div className="flex justify-start items-center gap-[4px] cursor-pointer">
          <Plus size={18} color="#7390FE" />

          <p className="text-create-list font-medium text-[14px]">new</p>
        </div>
      </div>
      <div className="pl-[30px] flex flex-col  items-start gap-[16px] text-content-secondary">
        {[
          { color: "#69D571", name: "easy" },
          { color: "#D569B2", name: "difficulty" },
          { color: "#697ED5", name: "pressing" },
          { color: "#D5C169", name: "later" },
        ].map((item) => {
          return <TagItem key={item.name} item={item} />;
        })}
      </div>
    </div>
  );
}
