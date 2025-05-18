"use client";

import { Button, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useCallback, useMemo } from "react";
import { useSnapshot } from "valtio";
import { modalsState } from "./state";
import { DialogUtils } from "./utils";
import { Circle, Clock } from "lucide-react";
import { Modals } from "./type";
import { cn } from "@/lib/utils";
import ProjectItem from "../project-item";
import TagItem from "../tag-item";

export default function TaskModal() {
  const modalsSnap = useSnapshot(modalsState);

  const isOpen = useMemo(() => {
    return modalsSnap.activeModalId === "taskModal";
  }, [modalsSnap.activeModalId]);

  const close = useCallback(() => {
    DialogUtils.hide("taskModal");
  }, []);

  const position = useMemo(() => {
    if (modalsSnap.extraData) {
      const x = (modalsSnap.extraData as Modals["taskModal"])!.x;
      const y = (modalsSnap.extraData as Modals["taskModal"])!.y;
      return { x, y };
    }
    return null;
  }, [modalsSnap.extraData]);

  return (
    <>
      <Dialog
        open={isOpen}
        as="div"
        className="relative z-14 focus:outline-none"
        onClose={close}
      >
        <div className="fixed inset-0 z-12 w-screen overflow-y-auto">
          <div
            className={cn(
              "flex min-h-full  relative",
              `${
                position
                  ? "justify-start items-start"
                  : "justify-center items-center"
              }`
            )}
          >
            <DialogPanel
              transition
              className="w-[320px] flex-shrink-0 max-w-md rounded-[16px] bg-white border-1 border-[#f1f1f1] p-6 backdrop-blur-2xl shadow-modal duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
              style={
                position
                  ? {
                      position: "absolute",
                      top: `${position.y}px`,
                      left: `${position.x}px`,
                    }
                  : {}
              }
            >
              <div className="flex items-start gap-[18px]">
                <div className="project flex-shrink-0 w-[4px] h-[20px] rounded-[2px] bg-[#f05252]"></div>
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-[8px] relative top-[-4px]">
                    <Circle size={18} color="#8A8A8A" className="relative" />
                    <div className="flex flex-col">
                      <p className="text-[18px] font-medium text-content">
                        develop doen
                      </p>
                    </div>
                  </div>
                  <div className="text-[14px] font-medium text-content-description ml-[26px]">
                    something about this task
                  </div>
                  <div className="flex items-center gap-[8px] relative top-[-4px] mt-[24px]">
                    <Clock size={18} color="#8A8A8A" className="relative" />
                    <div className="flex flex-col">
                      <p className="text-[18px] font-medium text-content">
                        14:00 - 15:00
                      </p>
                    </div>
                  </div>
                  <div className="text-[14px] font-medium text-content-date ml-[26px]">
                    May 18
                  </div>
                  <div className="flex items-center justify-start gap-[16px] mt-[24px]">
                    <ProjectItem
                      item={{ name: "AiVideo", color: "#F05252" }}
                      tight
                      textColor="#B9B9B9"
                    />
                    <TagItem
                      item={{ name: "easy", color: "#69D571" }}
                      tight
                      textColor="#B9B9B9"
                    />
                  </div>
                  <div className="w-full flex items-center justify-between gap-[16px] mt-[20px] pr-[22px]">
                    <div className="flex-1 h-[36px] rounded-[10px] bg-primary center font-semibold text-[14px] text-white cursor-pointer">
                      Apply
                    </div>
                    <div className="w-[66px] h-[36px] bg-white text-content text-[14px] font-semibold center border-1 rounded-[10px] cursor-pointer">
                      Delete
                    </div>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
