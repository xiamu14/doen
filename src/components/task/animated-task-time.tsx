"use client";

import dayjs from "dayjs";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { createRef, forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef } from "react";

type DigitHandle = { update: (digit: number, direction: number, hidden: boolean) => void };
export type TaskTimeHandle = { update: (start: string, duration: number) => void };
const transition = { type: "spring", duration: 0.32, bounce: 0 } as const;

const Digit = memo(forwardRef<DigitHandle, { digit: number; hidden: boolean }>(function Digit({ digit, hidden }, ref) {
  const position = useMotionValue(10 + digit);
  const width = useMotionValue(hidden ? 0 : 1);
  const y = useTransform(position, (value) => `${-value}em`);
  const digitWidth = useTransform(width, (value) => `${value}ch`);
  const edgeBlurOpacity = useTransform(position, (value) => Math.sin(Math.PI * (value % 1)) ** 2);
  const reducedMotion = useReducedMotion();
  const target = useRef({ digit, hidden });
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const widthAnimation = useRef<ReturnType<typeof animate> | null>(null);
  useImperativeHandle(ref, () => ({
    update(next, direction, hide) {
      if (next === target.current.digit && hide === target.current.hidden) return;
      animation.current?.stop();
      widthAnimation.current?.stop();
      // Keep the current fractional position when an unfinished roll is interrupted.
      const current = ((position.get() % 10) + 10) % 10 + 10;
      position.set(current);
      let destination = 10 + next;
      if (direction > 0 && destination < current) destination += 10;
      if (direction < 0 && destination > current) destination -= 10;
      if (reducedMotion) {
        position.set(10 + next);
        width.set(hide ? 0 : 1);
      } else {
        animation.current = animate(position, destination, transition);
        if (hide !== target.current.hidden) widthAnimation.current = animate(width, hide ? 0 : 1, transition);
      }
      target.current = { digit: next, hidden: hide };
    },
  }), [position, width, reducedMotion]);
  useEffect(() => () => {
    animation.current?.stop();
    widthAnimation.current?.stop();
  }, []);
  return <motion.span className="relative inline-block h-[1em] overflow-hidden" style={{ width: digitWidth }}>
    <motion.span className="block" style={{ y }}>
      {Array.from({ length: 30 }, (_, index) => <span key={index} className="block h-[1em] leading-none">{index % 10}</span>)}
    </motion.span>
    <motion.span className="pointer-events-none absolute inset-0" style={{
      opacity: edgeBlurOpacity,
      backdropFilter: "blur(2px)",
      maskImage: "linear-gradient(to bottom, black, transparent 45%, transparent 55%, black)",
    }} />
  </motion.span>;
}));

export const AnimatedTaskTime = memo(forwardRef<TaskTimeHandle, { start: string; duration: number }>(function AnimatedTaskTime({ start, duration }, ref) {
  const initial = useRef({ start, duration }).current;
  const previous = useRef(initial);
  const digits = useMemo(() => Array.from({ length: 8 }, () => createRef<DigitHandle>()), []);
  const label = useRef<HTMLSpanElement>(null);
  const initialTimes = [dayjs(initial.start), dayjs(initial.start).add(initial.duration, "minute")];
  const update = (nextStart: string, nextDuration: number) => {
    const before = [dayjs(previous.current.start), dayjs(previous.current.start).add(previous.current.duration, "minute")];
    const after = [dayjs(nextStart), dayjs(nextStart).add(nextDuration, "minute")];
    after.forEach((time, endpoint) => {
      const direction = Math.sign(time.valueOf() - before[endpoint].valueOf());
      time.format("HHmm").split("").forEach((digit, index) => {
        digits[endpoint * 4 + index].current?.update(Number(digit), direction, index === 0 && time.hour() < 10);
      });
    });
    if (label.current) label.current.textContent = `${after[0].format("H:mm")} - ${after[1].format("H:mm")}`;
    previous.current = { start: nextStart, duration: nextDuration };
  };
  useImperativeHandle(ref, () => ({ update }));
  useEffect(() => { update(start, duration); }, [start, duration]);
  return <span>
    <span ref={label} className="sr-only">{initialTimes.map((time) => time.format("H:mm")).join(" - ")}</span>
    <span aria-hidden="true" className="inline-flex items-baseline tabular-nums leading-none">
      {initialTimes.map((time, endpoint) => <span key={endpoint} className="inline-flex items-baseline">
        {endpoint === 1 && <span className="whitespace-pre"> - </span>}
        {time.format("HHmm").split("").map((digit, index) => <span key={index} className="inline-flex items-baseline">
          {index === 2 && <span>:</span>}
          <Digit ref={digits[endpoint * 4 + index]} digit={Number(digit)} hidden={index === 0 && time.hour() < 10} />
        </span>)}
      </span>)}
    </span>
  </span>;
}));
