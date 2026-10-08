"use client";

import { cn } from "@/components/ui/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClassNameValue } from "tailwind-merge";

type Props = {
  onChange: (event: Event) => void;
  value: string;
  disable?: boolean;
  className?: ClassNameValue;
  ariaLabel?: string;
  singleLine?: boolean;
  onFocus?: React.FocusEventHandler<HTMLDivElement>;
};

export default function CustomInput({
  disable,
  value = "",
  onChange,
  className,
  ariaLabel,
  singleLine = false,
  onFocus,
}: Props) {
  const editableRef = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState<{ left: number; top: number; height: number } | null>(null);
  const updateCaret = useCallback(() => {
    const editable = editableRef.current;
    const selection = window.getSelection();
    if (!editable || document.activeElement !== editable || !selection?.isCollapsed ||
      !selection.rangeCount || !selection.anchorNode || !editable.contains(selection.anchorNode)) {
      setCaret(null);
      return;
    }
    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(true);
    const remaining = range.cloneRange();
    remaining.selectNodeContents(editable);
    remaining.setStart(range.endContainer, range.endOffset);
    let rect = range.getClientRects()[0];
    const bounds = editable.getBoundingClientRect();
    if (singleLine && rect) {
      if (rect.left > bounds.right - 4) editable.scrollLeft += rect.left - bounds.right + 4;
      if (rect.left < bounds.left + 4) editable.scrollLeft -= bounds.left + 4 - rect.left;
      rect = range.getClientRects()[0];
    }
    const style = getComputedStyle(editable);
    setCaret({
      left: (rect?.left ?? bounds.left + parseFloat(style.paddingLeft)) + (singleLine && !remaining.toString() ? 2 : 0),
      top: rect?.top ?? bounds.top + parseFloat(style.paddingTop),
      height: rect?.height || parseFloat(style.fontSize) * 1.2,
    });
  }, [singleLine]);
  useEffect(() => {
    if (editableRef.current && editableRef.current.textContent !== value) {
      editableRef.current.textContent = value;
    }
  }, [value]);
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
      <div
        contentEditable={disable ? "false" : "true"}
        className={cn("outline-none caret-primary", caret && "caret-transparent", singleLine && "whitespace-nowrap overflow-x-auto scrollbar-hide", className)}
        ref={editableRef}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline={!singleLine}
        onFocus={(event) => {
          onFocus?.(event);
          updateCaret();
        }}
        onBlur={() => setCaret(null)}
        onKeyUp={updateCaret}
        onMouseUp={updateCaret}
        onKeyDown={(event) => {
          if (singleLine && event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault();
        }}
        onPaste={(event) => {
          if (!singleLine) return;
          event.preventDefault();
          // ponytail: execCommand keeps the caret and undo history; replace it if browser support drops.
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain").replace(/[\r\n]+/g, " "));
        }}
        onInput={(event) => {
          onChange(event.nativeEvent);
          updateCaret();
        }}
      />
      {caret && createPortal(
        <div aria-hidden="true" data-custom-caret className="custom-caret-blink fixed z-[100] w-[2px] rounded-full bg-primary pointer-events-none" style={caret} />,
        document.body,
      )}
    </>
  );
}
