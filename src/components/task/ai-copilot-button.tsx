"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Sparkles } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import styles from "./ai-copilot-button.module.css";

function AICopilotButton() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = 1.25;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePlayback = () => {
      if (motion.matches) video.pause();
      else void video.play().catch(() => {});
    };
    updatePlayback();
    motion.addEventListener("change", updatePlayback);
    return () => {
      motion.removeEventListener("change", updatePlayback);
      video.pause();
    };
  }, []);

  return (
    <Popover className="relative">
      <PopoverButton aria-label="AI Copilot" className={`${styles.button} flex h-[40px] w-[40px] items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none focus:outline-none focus-visible:outline-none`}>
        <span className={styles.orb} aria-hidden="true">
          <video
            ref={videoRef}
            className={styles.video}
            src="/ai-copilot-prism.mp4"
            poster="/ai-copilot-prism-poster.png"
            muted
            loop
            playsInline
            preload="metadata"
          />
          <Sparkles size={16} strokeWidth={1.7} className={styles.icon} />
        </span>
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        transition
        className="z-20 mt-[6px] w-[280px] rounded-[12px] border border-[#f1f1f1] bg-white p-4 text-content shadow-modal outline-none duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
      >
        <p className="text-[13px] font-normal text-content-secondary">内容待定</p>
      </PopoverPanel>
    </Popover>
  );
}

export default memo(AICopilotButton);
