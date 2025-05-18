"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { ClassNameValue } from "tailwind-merge";

type Props = {
  onChange: (event: Event) => void;
  value: string;
  disable?: boolean;
  className?: ClassNameValue;
};

export default function CustomInput({
  disable,
  value = "",
  onChange,
  className,
}: Props) {
  const editableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    editableRef.current?.addEventListener("input", onChange);
    return () => {
      editableRef.current?.removeEventListener("input", onChange);
    };
  }, []);
  return (
    <div
      contentEditable={disable ? "false" : "true"}
      className={cn("outline-none", className)}
      ref={editableRef}
      suppressContentEditableWarning={true}
    >
      {value}
    </div>
  );
}
