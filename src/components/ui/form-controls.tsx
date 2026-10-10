"use client";

import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/utils";

export const TextArea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function TextArea(
  { className, onChange, value, ...props },
  forwardedRef,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const resize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    const style = window.getComputedStyle(textarea);
    const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    textarea.style.height = `${textarea.scrollHeight + (style.boxSizing === "border-box" ? borders : 0)}px`;
  };
  const updateCaret = useCallback(() => {
    const textarea = textareaRef.current;
    const caret = caretRef.current;
    if (!textarea || !caret) return;
    if (document.activeElement !== textarea) {
      caret.style.display = "none";
      textarea.style.caretColor = "";
      return;
    }
    if (textarea.selectionStart !== textarea.selectionEnd) {
      caret.style.display = "none";
      textarea.style.caretColor = "";
      return;
    }

    const bounds = textarea.getBoundingClientRect();
    const style = window.getComputedStyle(textarea);
    const mirror = document.createElement("div");
    Object.assign(mirror.style, {
      position: "fixed",
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      width: `${bounds.width}px`,
      boxSizing: style.boxSizing,
      font: style.font,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textAlign: style.textAlign,
      textIndent: style.textIndent,
      padding: style.padding,
      border: style.border,
      whiteSpace: "pre-wrap",
      overflowWrap: "break-word",
      wordBreak: style.wordBreak,
      tabSize: style.tabSize,
      visibility: "hidden",
      overflow: "hidden",
    });
    mirror.textContent = textarea.value.slice(0, textarea.selectionStart);
    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    Object.assign(marker.style, { display: "inline-block", width: "0", height: style.lineHeight === "normal" ? style.fontSize : style.lineHeight, verticalAlign: "baseline" });
    mirror.append(marker);
    document.body.append(mirror);
    const position = marker.getBoundingClientRect();
    mirror.remove();

    caret.style.left = `${position.left}px`;
    caret.style.top = `${position.top}px`;
    caret.style.height = `${position.height || parseFloat(style.fontSize) * 1.2}px`;
    caret.style.display = "block";
    textarea.style.caretColor = "transparent";
  }, []);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      resize(textareaRef.current);
      updateCaret();
    }
  }, [value, props.rows]);

  useEffect(() => {
    document.addEventListener("selectionchange", updateCaret);
    document.addEventListener("scroll", updateCaret, true);
    window.addEventListener("resize", updateCaret);
    return () => {
      document.removeEventListener("selectionchange", updateCaret);
      document.removeEventListener("scroll", updateCaret, true);
      window.removeEventListener("resize", updateCaret);
    };
  }, [updateCaret]);

  return (
    <>
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
          updateCaret();
        }}
        onFocus={updateCaret}
        onSelect={updateCaret}
        onKeyUp={updateCaret}
        onBlur={() => {
          if (caretRef.current) caretRef.current.style.display = "none";
          if (textareaRef.current) textareaRef.current.style.caretColor = "";
        }}
        className={cn(className, "resize-none overflow-hidden caret-primary")}
      />
      {typeof document !== "undefined" && createPortal(
        <div ref={caretRef} aria-hidden="true" className="custom-caret-blink fixed z-[100] hidden w-[2px] rounded-full bg-primary pointer-events-none" />,
        document.body,
      )}
    </>
  );
});

export function Button(props: ComponentProps<"button">) {
  return <button {...props} />;
}
