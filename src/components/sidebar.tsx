import { ListMenu, TagMenu } from "./sidebar-menu";

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
