"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Label from "@radix-ui/react-label";
import { Check, CircleCheck, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { memo, useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import type { TaskRecord } from "@/client/api/task";
import { scheduleActiveDay } from "@/client/api/task";
import { Button, TextArea } from "@/components/ui/form-controls";
import { DEFAULT_REST_RULE } from "@/lib/task-schedule-config";
import styles from "./ai-copilot-button.module.css";

gsap.registerPlugin(Flip);

type FormValues = { taskInstruction: string; eventConstraintsEnabled: boolean; eventInstruction: string; restInstruction: string };
const eventInstructionStorageKey = "ai-copilot-event-instruction";
const restInstructionStorageKey = "ai-copilot-rest-instruction";

function CopilotForm({ activeDay, close, onApply }: {
  activeDay: string;
  close: () => void;
  onApply: (values: FormValues) => Promise<void>;
}) {
  const [taskInstruction, setTaskInstruction] = useState("");
  const [eventConstraintsEnabled, setEventConstraintsEnabled] = useState(true);
  const [eventInstruction, setEventInstruction] = useState("");
  const [restInstruction, setRestInstruction] = useState(DEFAULT_REST_RULE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      setEventInstruction(localStorage.getItem(eventInstructionStorageKey) ?? "");
      setRestInstruction(localStorage.getItem(restInstructionStorageKey) ?? DEFAULT_REST_RULE);
    } catch {
      // Keep the form usable when browser storage is unavailable.
    }
  }, []);
  const activeDayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${activeDay}T12:00:00Z`));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onApply({ taskInstruction, eventConstraintsEnabled, eventInstruction, restInstruction });
      toast.success("Your day is planned.", {
        position: "top-center",
        icon: <CircleCheck size={20} color="#69D571" strokeWidth={2.5} />,
        style: { width: "fit-content", padding: "16px 20px", justifyContent: "center", alignItems: "center" },
      });
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scheduling failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <p className="text-[14px] font-bold text-content">AI Copilot</p>
      <div className="flex flex-col gap-1 text-[14px] text-content-secondary">
        <TextArea
          id="copilot-task-instruction"
          value={taskInstruction}
          onChange={(event) => setTaskInstruction(event.target.value)}
          placeholder={`Tell AI Copilot how to change ${activeDayLabel}'s tasks…`}
          rows={3}
          maxLength={2000}
          className="rounded-[8px] border-0 bg-[#e8e8e8] px-2.5 py-2 text-[14px] text-[#333] placeholder:text-[#666] outline-none focus:outline-none focus-visible:outline-none"
          disabled={busy}
        />
      </div>
      <div className="flex items-center gap-2 text-[14px] text-content">
        <Checkbox.Root
          id="copilot-event-constraints"
          checked={eventConstraintsEnabled}
          onCheckedChange={(checked) => setEventConstraintsEnabled(checked === true)}
          disabled={busy}
          className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-primary bg-white text-primary data-[state=checked]:bg-primary data-[state=checked]:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          <Checkbox.Indicator><Check size={12} strokeWidth={3} /></Checkbox.Indicator>
        </Checkbox.Root>
        <Label.Root htmlFor="copilot-event-constraints">Event constraints</Label.Root>
      </div>
      <TextArea
        id="copilot-event-instruction"
        value={eventInstruction}
        onChange={(event) => {
          const value = event.target.value;
          setEventInstruction(value);
          try {
            localStorage.setItem(eventInstructionStorageKey, value);
          } catch {
            // Keep the form usable when browser storage is unavailable.
          }
        }}
        placeholder="Tell AI Copilot how to schedule around events…"
        rows={3}
        maxLength={2000}
        disabled={busy}
        className="rounded-[8px] border-0 bg-[#e8e8e8] px-2.5 py-2 text-[14px] text-[#333] placeholder:text-[#666] outline-none focus:outline-none focus-visible:outline-none disabled:bg-[#e8e8e8]"
      />
      <div className="flex items-center gap-1 text-[14px] text-content">
        <Label.Root htmlFor="copilot-rest-instruction">Rest rules</Label.Root>
        {restInstruction !== DEFAULT_REST_RULE && (
          <Button
            type="button"
            aria-label="Reset rest rules"
            title="Reset rest rules"
            disabled={busy}
            onClick={() => {
              setRestInstruction(DEFAULT_REST_RULE);
              try {
                localStorage.setItem(restInstructionStorageKey, DEFAULT_REST_RULE);
              } catch {
                // Keep the form usable when browser storage is unavailable.
              }
            }}
            className="flex size-6 items-center justify-center rounded text-primary hover:bg-[#f6f6f6] disabled:opacity-50"
          >
            <RotateCcw size={16} aria-hidden="true" />
          </Button>
        )}
      </div>
      <TextArea
        id="copilot-rest-instruction"
        value={restInstruction}
        onChange={(event) => {
          const value = event.target.value;
          setRestInstruction(value);
          try {
            localStorage.setItem(restInstructionStorageKey, value);
          } catch {
            // Keep the form usable when browser storage is unavailable.
          }
        }}
        placeholder="Describe when to take breaks…"
        rows={2}
        maxLength={2000}
        disabled={busy}
        className="rounded-[8px] border-0 bg-[#e8e8e8] px-2.5 py-2 text-[14px] text-[#333] placeholder:text-[#666] outline-none focus:outline-none focus-visible:outline-none disabled:bg-[#e8e8e8]"
      />
      {error && <p role="alert" className="text-[14px] text-red-600">{error}</p>}
      <Button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className="flex h-[40px] items-center justify-center rounded-full bg-primary px-3 text-[14px] font-semibold text-white disabled:opacity-60 mt-2 mb-2"
      >
        {busy && <LoaderCircle size={16} aria-hidden="true" className="mr-2 animate-spin" />}
        {busy ? "Planning..." : "Plan My Day"}
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
