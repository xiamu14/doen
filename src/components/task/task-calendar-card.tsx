"use client";
import { DialogUtils } from "../Dialog";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Draggable } from "gsap/Draggable";
import { useRef } from "react";

gsap.registerPlugin(Draggable);
export default function TaskCalendarCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const resizableBottomHandle = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const draggableContainer = document.getElementById(
      "task-calendar-draggable"
    );
    const mainDraggle = Draggable.create(cardRef.current, {
      bounds: draggableContainer,
      autoScroll: 1,
      cursor: "pointer",
      edgeResistance: 0.65,
      type: "x,y",
      throwProps: true,
      liveSnap: false,
    });

    const $bottom = document.createElement("div");

    const bottomDraggable = Draggable.create($bottom, {
      trigger: ".resizable-bottom",
      cursor: "s-resize",
      onDrag: () => {
        gsap.set(cardRef.current, {
          height: Math.min(
            110,
            Math.max(
              35,
              cardRef.current!.offsetHeight + bottomDraggable[0].deltaY
            )
          ),
          // height: "+=" + bottomDraggable[0].deltaY,
        });
      },
      onPress: () => {
        mainDraggle[0].disable();
      },
      onRelease: () => {
        mainDraggle[0].enable();
      },
    });
  });

  return (
    <div
      className="absolute left-[10%] w-[120px] h-[35px] bg-[#FDF1E0] rounded-[6px] flex flex-col justify-start px-[10px] overflow-hidden cursor-pointer z-12"
      ref={cardRef}
      style={{ left: 15, top: 30 }}
      onClick={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        // console.log("[rect]", rect);
        DialogUtils.show("taskModal", {
          x: rect.right + 6,
          y: rect.top - 10,
          taskId: "",
        });
      }}
    >
      <p className="text-[12px] font-semibold text-[#96753B] truncate flex-shrink-0">
        develop doen web app
      </p>
      <p className="text-[8px] mt-[4px] text-[#96753B] my-0">8:00 - 9:00</p>
      {/* <p className="text-[8px] text-[#96753B] my-0">9:00</p> */}
      <div
        className="resizable-bottom absolute left-0 bottom-0 w-full h-[10px] cursor-s-resize"
        ref={resizableBottomHandle}
      ></div>
    </div>
  );
}
