"use client";

import { forwardRef, useLayoutEffect, useRef, type ComponentProps } from "react";
import { cn } from "@/components/ui/utils";

export const TextArea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function TextArea(
  { className, onChange, value, ...props },
  forwardedRef,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    const style = window.getComputedStyle(textarea);
    const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    textarea.style.height = `${textarea.scrollHeight + (style.boxSizing === "border-box" ? borders : 0)}px`;
  };

  useLayoutEffect(() => {
    if (textareaRef.current) resize(textareaRef.current);
  }, [value, props.rows]);

  return (
    <textarea
      {...props}
      ref={(element) => {
        textareaRef.current = element;
        if (typeof forwardedRef === "function") forwardedRef(element);
        else if (forwardedRef) forwardedRef.current = element;
      }}
      value={value}
      onChange={(event) => {
        onChange?.(event);
        resize(event.currentTarget);
      }}
      className={cn(className, "resize-none overflow-hidden caret-primary")}
    />
  );
});

export function Button(props: ComponentProps<"button">) {
  return <button {...props} />;
}
