export default function TaskPanel() {
  return (
    <div>
      <div className="flex items-center h-[34px] rounded-[8px] border-[1px] border-[#dedede] bg-[white] text-content font-semibold text-[16px] overflow-hidden">
        <div className="flex justify-center items-center px-[10px] h-full bg-[#dedede] cursor-pointer">
          Calendar
        </div>
        <div className="w-[1px] h-full bg-[#dedede]"></div>
        <div className="h-full center px-[10px] cursor-pointer">Board</div>
      </div>
    </div>
  );
}
