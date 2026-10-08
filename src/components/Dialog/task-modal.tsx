"use client";

import { Dialog, DialogPanel } from "@headlessui/react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnapshot } from "valtio";
import dayjs from "dayjs";
import { Circle, CircleCheck, Clock } from "lucide-react";
import { createTask, deleteTask, getList, updateTask, type TaskRecord } from "@/client/api/task";
import CustomInput from "@/components/custom-input";
import ProjectItem from "@/components/project-item";
import TagItem from "@/components/tag-item";
import { FIRST_HOUR, LAST_HOUR, SLOT_MINUTES } from "@/components/task/calendar-time";
import { modalsState } from "./state";
import { DialogUtils } from "./utils";
import type { Modals } from "./type";

export default function TaskModal() {
  const modal = useSnapshot(modalsState);
  const queryClient = useQueryClient();
  const { data: list } = useQuery({ queryKey: ["list"], queryFn: getList });
  const projects = list?.data.project ?? [];
  const isOpen = modal.activeModalId === "taskModal";
  const data = modal.extraData as Modals["taskModal"];
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState<string | null | undefined>();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState<TaskRecord["status"]>("idle");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const start = dayjs(data?.task?.start ?? data?.start ?? new Date());
    setTitle(data?.task?.title ?? "New Task Name");
    setContent(data?.task?.content ?? "something about this task");
    setProjectId(data?.task ? data.task.projectId : undefined);
    setStatus(data?.task?.status ?? "idle");
    setDate(start.format("YYYY-MM-DD"));
    setStartTime(start.format("HH:mm"));
    setEndTime(start.add(data?.task?.duration ?? 30, "minute").format("HH:mm"));
    setError("");
  }, [isOpen, data?.task?.id, data?.start]);

  const close = () => DialogUtils.hide("taskModal");
  const selectedProjectId = projectId === undefined ? projects[0]?.id ?? null : projectId;
  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    if (!list) {
      setError("Could not load projects. Try again.");
      return;
    }
    const startMinutes = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3));
    const endMinutes = Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3));
    const duration = endMinutes - startMinutes;
    if (!title.trim() || !date || startMinutes < FIRST_HOUR * 60 || endMinutes > LAST_HOUR * 60 ||
      duration < SLOT_MINUTES || startMinutes % SLOT_MINUTES || duration % SLOT_MINUTES) {
      setError("Use a title and 15-minute times between 07:00 and 23:00.");
      return;
    }
    const start = new Date(`${date}T${startTime}:00`).toISOString();
    setIsSaving(true);
    setError("");
    try {
      const values = { title: title.trim(), content: content.trim(), start, duration, status, projectId: selectedProjectId, tagId: null };
      const task = data?.task
        ? await updateTask({ ...data.task, ...values, tagId: data.task.tagId })
        : await createTask(values);
      queryClient.setQueryData<TaskRecord[]>(["tasks"], (current = []) => data?.task
        ? current.map((item) => item.id === task.id ? task : item)
        : [...current, task]);
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save task.");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!data?.task || isSaving || !window.confirm(`Delete "${data.task.title}"?`)) return;
    setIsSaving(true);
    setError("");
    try {
      await deleteTask(data.task.id);
      queryClient.setQueryData<TaskRecord[]>(["tasks"], (current = []) =>
        current.filter((item) => item.id !== data.task?.id));
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete task.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} as="div" className="relative z-50 focus:outline-none" onClose={close}>
      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className={`flex min-h-full relative ${data ? "justify-start items-start" : "justify-center items-center"}`}>
          <DialogPanel
            transition
            className="w-[320px] flex-shrink-0 max-w-md rounded-[16px] bg-white border-1 border-[#f1f1f1] p-6 backdrop-blur-2xl shadow-modal duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
            style={data ? { position: "absolute", top: `${data.y}px`, left: `${data.x}px` } : {}}
          >
            <form onSubmit={save} className="flex items-start gap-[10px] pr-[22px]">
              <div className="project flex-shrink-0 w-[4px] h-[20px] rounded-[2px] bg-[#f05252]" />
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-[8px] relative top-[-4px]">
                  <button
                    type="button"
                    aria-label={status === "done" ? "Mark task incomplete" : "Mark task complete"}
                    disabled={isSaving}
                    onClick={() => setStatus((current) => current === "done" ? "idle" : "done")}
                    className="flex-shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {status === "done" ? <CircleCheck size={18} color="#69D571" /> : <Circle size={18} color="#8A8A8A" />}
                  </button>
                  <div className="flex flex-col flex-1 min-w-0">
                    <CustomInput
                      ariaLabel="Task title"
                      singleLine
                      value={title}
                      onChange={(event) => setTitle((event.target as HTMLDivElement).textContent ?? "")}
                      className="min-h-[22px] text-[18px] font-medium text-content"
                    />
                  </div>
                </div>
                <CustomInput
                  ariaLabel="Task description"
                  value={content}
                  onChange={(event) => setContent((event.target as HTMLDivElement).textContent ?? "")}
                  className="px-[4px] py-[2px] min-h-[20px] text-[14px] font-medium text-content-description rounded-[6px] ml-[24px] focus:bg-[#eee] focus:text-[#666]"
                />
                <div className="flex items-center gap-[8px] relative top-[-4px] mt-[14px]">
                  <Clock size={18} color="#8A8A8A" className="relative" />
                  <div className="flex flex-col">
                    <p className="text-[18px] font-medium text-content">{startTime} - {endTime}</p>
                  </div>
                </div>
                <div className="text-[14px] font-medium text-content-date ml-[26px]">{date && dayjs(date).format("MMM D")}</div>
                <div className="flex items-center justify-start gap-[16px] mt-[14px]">
                  <ProjectItem
                    item={selectedProject ?? { name: "No project", color: "#B9B9B9" }}
                    projects={projects}
                    projectId={selectedProjectId}
                    onProjectChange={(id) => setProjectId(id || null)}
                    tight textColor="#B9B9B9" isSelection
                  />
                  <TagItem item={{ name: "easy", color: "#69D571" }} tight textColor="#B9B9B9" isSelection />
                </div>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                <div className="w-full flex items-center justify-between gap-[16px] mt-[20px]">
                  {data?.task && <button type="button" onClick={remove} disabled={isSaving} className="flex-1 h-[36px] bg-white text-content text-[14px] font-semibold center border-1 rounded-[10px] cursor-pointer disabled:opacity-50">Delete</button>}
                  <button type="submit" disabled={isSaving} className="flex-1 h-[36px] rounded-[10px] bg-primary center font-semibold text-[14px] text-white cursor-pointer disabled:opacity-50">{isSaving ? "Saving..." : "Apply"}</button>
                </div>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
