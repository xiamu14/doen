"use client";
import { Dialog, DialogPanel } from "@headlessui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSnapshot } from "valtio";
import { modalsState } from "./state";
import { DialogUtils } from "./utils";
import { Modals } from "./type";
import { cn } from "@/components/ui/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function ProjectModal() {
  const modalsSnap = useSnapshot(modalsState);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [caret, setCaret] = useState<{ left: number; top: number; height: number } | null>(null);
  const project = modalsSnap.extraData as Modals["projectModal"];

  const isOpen = useMemo(() => {
    return modalsSnap.activeModalId === "projectModal";
  }, [modalsSnap.activeModalId]);

  useEffect(() => {
    if (isOpen) {
      setName(project?.name ?? "");
      setError("");
    }
  }, [isOpen, project?.projectId]);

  const close = useCallback(() => {
    DialogUtils.hide("projectModal");
  }, []);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/list", {
        method: project?.projectId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project?.projectId, name }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Could not save project.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["list"] });
      close();
    } catch {
      setError("Could not save project.");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!project?.projectId || isSaving || !window.confirm(`Delete "${project.name}"?`)) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.projectId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Could not delete project.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["list"] });
      close();
    } catch {
      setError("Could not delete project.");
    } finally {
      setIsSaving(false);
    }
  };

  const position = useMemo(() => {
    if (modalsSnap.extraData) {
      const x = (modalsSnap.extraData as Modals["projectModal"])!.x;
      const y = (modalsSnap.extraData as Modals["projectModal"])!.y;
      return { x, y };
    }
    return null;
  }, [modalsSnap.extraData]);

  const [activeProject, setActiveProject] = useState(0);

  const updateCaret = (input: HTMLInputElement) => {
    if (input.selectionStart !== input.selectionEnd) {
      setCaret(null);
      return;
    }
    const style = getComputedStyle(input);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    context.font = style.font;
    const height = parseFloat(style.fontSize) * 1.2;
    setCaret({
      left: context.measureText(input.value.slice(0, input.selectionStart ?? 0)).width - input.scrollLeft + (input.selectionStart === input.value.length ? 2 : 0),
      top: (input.clientHeight - height) / 2,
      height,
    });
  };

  return (
    <>
      <Dialog
        open={isOpen}
        as="div"
        className="relative z-14 focus:outline-none"
        onClose={close}
      >
        <div className="fixed inset-0 z-12 w-screen overflow-y-auto">
          <div
            className={cn(
              "flex min-h-full  relative",
              `${
                position
                  ? "justify-start items-start"
                  : "justify-center items-center"
              }`
            )}
          >
            <DialogPanel
              transition
              className="w-[220px] flex-shrink-0 max-w-md rounded-[16px] bg-white border-1 border-[#f1f1f1] p-6 backdrop-blur-2xl shadow-modal duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
              style={
                position
                  ? {
                      position: "absolute",
                      top: `${position.y}px`,
                      left: `${position.x}px`,
                    }
                  : {}
              }
            >
              <form onSubmit={save} className="flex flex-col items-start gap-[16px]">
                <div className="flex gap-[10px]">
                  <div className="project w-[6px] h-[16px] rounded-[3px]" style={{ backgroundColor: project?.color ?? "#F05252" }}></div>
                  <div className="flex items-center gap-[8px] relative top-[-6px]">
                    <div className="flex flex-col relative">
                      <input
                        aria-label="Project name"
                        autoFocus
                        required
                        maxLength={20}
                        placeholder="New Project Name"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          updateCaret(event.target);
                        }}
                        onFocus={(event) => updateCaret(event.target)}
                        onBlur={() => setCaret(null)}
                        onSelect={(event) => updateCaret(event.currentTarget)}
                        onKeyUp={(event) => updateCaret(event.currentTarget)}
                        className={cn("w-full min-w-0 bg-transparent text-[18px] font-medium text-content outline-none", caret && "caret-transparent")}
                      />
                      {caret && <span aria-hidden="true" className="custom-caret-blink absolute z-[100] w-[2px] rounded-full bg-primary pointer-events-none" style={caret} />}
                    </div>
                  </div>
                </div>
                <div className="hidden items-center gap-[8px] relative top-[-4px]">
                  {["#FF6767", "#FF67CB", "#A667FF"].map((color, index) => {
                    const isActive = index === activeProject;
                    return (
                      <div
                        key={`color-${index}`}
                        className="w-[12px] h-[12px] rounded-full box-content cursor-pointer"
                        onClick={() => setActiveProject(index)}
                        style={{
                          backgroundColor: color,
                          border: !isActive ? "" : "1px solid #FFD1D1",
                        }}
                      ></div>
                    );
                  })}
                </div>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                <div className="center w-full justify-end gap-[8px]">
                  {project?.projectId && (
                    <button type="button" onClick={remove} disabled={isSaving} className="flex-1 h-[30px] rounded-[15px] bg-[#F05252] center font-semibold text-[14px] text-white cursor-pointer disabled:opacity-50">
                      Delete
                    </button>
                  )}
                  <button type="submit" disabled={isSaving} className="flex-1 h-[30px] rounded-[15px] bg-primary center font-semibold text-[14px] text-white cursor-pointer disabled:opacity-50">
                    {isSaving ? "Saving..." : "Apply"}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
