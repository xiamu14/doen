import type { ComponentProps } from "react";

export function TextArea(props: ComponentProps<"textarea">) {
  return <textarea {...props} />;
}

export function Checkbox(props: ComponentProps<"input">) {
  return <input type="checkbox" {...props} />;
}

export function Button(props: ComponentProps<"button">) {
  return <button {...props} />;
}
