"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Label from "@radix-ui/react-label";
import { Check, Sparkles } from "lucide-react";
import { memo, useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import type { TaskRecord } from "@/client/api/task";
import { scheduleActiveDay } from "@/client/api/task";
import { Button, TextArea } from "@/components/ui/form-controls";
import styles from "./ai-copilot-button.module.css";

gsap.registerPlugin(Flip);

type FormValues = { taskInstruction: string; eventConstraintsEnabled: boolean; eventInstruction: string };

function CopilotForm({ activeDay, close, onApply }: {
  activeDay: string;
  close: () => void;
  onApply: (values: FormValues) => Promise<void>;
}) {
  const [taskInstruction, setTaskInstruction] = useState("");
  const [eventConstraintsEnabled, setEventConstraintsEnabled] = useState(true);
  const [eventInstruction, setEventInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onApply({ taskInstruction, eventConstraintsEnabled, eventInstruction });
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scheduling failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <p className="text-[14px] font-semibold text-content">AI Copilot · {activeDay.slice(5).replace("-", ".")}</p>
      <div className="flex flex-col gap-1 text-[14px] text-content-secondary">
        <Label.Root htmlFor="copilot-task-instruction">Task adjustments</Label.Root>
        <TextArea
          id="copilot-task-instruction"
          value={taskInstruction}
          onChange={(event) => setTaskInstruction(event.target.value)}
          placeholder="Task changes…"
          rows={3}
          maxLength={2000}
          className="resize-y rounded-[8px] border border-[#e7e7e7] px-2.5 py-2 text-[14px] text-content outline-none focus:border-primary"
          disabled={busy}
        />
      </div>
      <div className="flex items-center gap-2 text-[14px] text-content">
        <Checkbox.Root
          id="copilot-event-constraints"
          checked={eventConstraintsEnabled}
          onCheckedChange={(checked) => setEventConstraintsEnabled(checked === true)}
          disabled={busy}
          className="flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-primary bg-white text-primary data-[state=checked]:bg-primary data-[state=checked]:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          <Checkbox.Indicator><Check size={14} strokeWidth={3} /></Checkbox.Indicator>
        </Checkbox.Root>
        <Label.Root htmlFor="copilot-event-constraints">Event constraints</Label.Root>
      </div>
      <TextArea
        id="copilot-event-instruction"
        value={eventInstruction}
        onChange={(event) => setEventInstruction(event.target.value)}
        placeholder="Event rules…"
        rows={2}
        maxLength={2000}
        disabled={busy || !eventConstraintsEnabled}
        className="resize-y rounded-[8px] border border-[#e7e7e7] px-2.5 py-2 text-[14px] text-content outline-none focus:border-primary disabled:bg-[#f7f7f7]"
      />
      {error && <p role="alert" className="text-[14px] text-red-600">{error}</p>}
      <Button
        type="submit"
        disabled={busy}
        className="flex h-[40px] items-center justify-center rounded-[10px] bg-primary px-3 text-[14px] font-semibold text-white disabled:opacity-60"
      >
        AI Copilot
      </Button>
    </form>
  );
}

function AICopilotButton({ activeDay }: { activeDay: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const queryClient = useQueryClient();

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

  const apply = async (values: FormValues) => {
    const arranged = await scheduleActiveDay({ activeDay, ...values });
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-task-id]"))
      .filter((element) => arranged.some((item) => item.id === element.dataset.taskId));
    const previousLayout = elements.length ? Flip.getState(elements) : null;
    const arrangedById = new Map(arranged.map((item) => [item.id, item]));
    queryClient.setQueryData<TaskRecord[]>(["tasks"], (current = []) =>
      current.map((item) => arrangedById.get(item.id) ?? item));
    if (previousLayout) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        Flip.from(previousLayout, { duration: 0.55, stagger: 0.035, ease: "power2.inOut" });
      }));
    }
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
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
            className="z-20 mt-[6px] w-[340px] rounded-[12px] border border-[#f1f1f1] bg-white p-4 text-content shadow-modal outline-none duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
          >
            {({ close }) => (
              <CopilotForm
                key={open ? "open" : "closed"}
                activeDay={activeDay}
                close={() => close()}
                onApply={apply}
              />
            )}
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}

export default memo(AICopilotButton);
