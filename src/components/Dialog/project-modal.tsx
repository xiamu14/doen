"use client";
import { Dialog, DialogPanel } from "@headlessui/react";
import { useCallback, useMemo, useState } from "react";
import { useSnapshot } from "valtio";
import { modalsState } from "./state";
import { DialogUtils } from "./utils";
import { Modals } from "./type";
import { cn } from "@/components/ui/utils";

export default function ProjectModal() {
  const modalsSnap = useSnapshot(modalsState);

  const isOpen = useMemo(() => {
    return modalsSnap.activeModalId === "projectModal";
  }, [modalsSnap.activeModalId]);

  const close = useCallback(() => {
    DialogUtils.hide("projectModal");
  }, []);

  const position = useMemo(() => {
    if (modalsSnap.extraData) {
      const x = (modalsSnap.extraData as Modals["projectModal"])!.x;
      const y = (modalsSnap.extraData as Modals["projectModal"])!.y;
      return { x, y };
    }
    return null;
  }, [modalsSnap.extraData]);

  const [activeProject, setActiveProject] = useState(0);

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
              className="w-[260px] flex-shrink-0 max-w-md rounded-[16px] bg-white border-1 border-[#f1f1f1] p-6 backdrop-blur-2xl shadow-modal duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
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
              <div className="flex flex-col items-start gap-[16px]">
                <div className="flex gap-[10px]">
                  <div className="project w-[6px] h-[16px] rounded-[3px] bg-[#f05252]"></div>
                  <div className="flex items-center gap-[8px] relative top-[-6px]">
                    <div className="flex flex-col">
                      <p className="text-[18px] font-medium text-content">
                        New Project Name
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-[8px] relative top-[-4px]">
                  {["#FF6767", "#FF67CB", "#A667FF"].map((color, index) => {
                    const isActive = index === activeProject;
                    return (
                      <div
                        key={`color-${index}`}
                        className="w-[12px] h-[12px] rounded-full box-content cursor-pointer"
                        onClick={() => setActiveProject(index)}
                        style={{
                          backgroundColor: color,
                          border: !isActive ? "" : "1px solid #FFD1D1",
                        }}
                      ></div>
                    );
                  })}
                </div>
                <div className="center w-full">
                  <div className="w-[90px] h-[30px] rounded-[15px] bg-primary center font-semibold text-[14px] text-white cursor-pointer">
                    Apply
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
