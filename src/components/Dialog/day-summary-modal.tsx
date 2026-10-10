"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { useSnapshot } from "valtio";
import { getList, getTasks } from "@/client/api/task";
import { TASK_TAGS } from "@/lib/task-tags";
import { modalsState } from "./state";
import { DialogUtils } from "./utils";
import type { Modals } from "./type";

const DAY_MINUTES = 16 * 60;

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? `${remainder}m` : ""}` : `${minutes}m`;
}

export default function DaySummaryModal() {
  const modal = useSnapshot(modalsState);
  const data = modal.extraData as Modals["daySummaryModal"];
  const isOpen = modal.activeModalId === "daySummaryModal";
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: getTasks,
    enabled: isOpen,
  });
  const { data: list } = useQuery({
    queryKey: ["list"],
    queryFn: getList,
    enabled: isOpen,
  });
  const dayTasks = tasks.filter(
    (task) => data && dayjs(task.start).format("YYYY-MM-DD") === data.date,
  );
  const completed = dayTasks
    .filter((task) => task.status === "done")
    .reduce((sum, task) => sum + task.duration, 0);
  const unfinished = dayTasks
    .filter((task) => task.status !== "done")
    .reduce((sum, task) => sum + task.duration, 0);
  const now = dayjs();
  const focusDuration = dayTasks
    .filter((task) => task.status === "done" || !dayjs(task.start).add(task.duration, "minute").isBefore(now))
    .reduce((sum, task) => sum + task.duration, 0);
  const planPercent = Math.min(focusDuration, DAY_MINUTES) / DAY_MINUTES * 100;
  const planned = completed + unfinished;
  const totalTaskDuration = dayTasks.reduce(
    (sum, task) => sum + task.duration,
    0,
  );
  const projects = list?.data.project ?? [];
  const projectTotals = projects
    .map((project) => ({
      ...project,
      duration: dayTasks
        .filter((task) => task.projectId === project.id)
        .reduce((sum, task) => sum + task.duration, 0),
    }))
    .filter((project) => project.duration > 0);
  const noProjectDuration = dayTasks
    .filter((task) => !task.projectId)
    .reduce((sum, task) => sum + task.duration, 0);
  if (noProjectDuration)
    projectTotals.push({
      id: "none",
      name: "No project",
      color: "#999999",
      duration: noProjectDuration,
    });
  projectTotals.sort((a, b) => b.duration - a.duration);
  const maxProjectDuration = Math.max(
    0,
    ...projectTotals.map((project) => project.duration),
  );
  const panelWidth = data ? Math.min(360, window.innerWidth - 32) : 0;
  const panelHeight = data
    ? Math.max(120, Math.min(450, window.innerHeight - data.y - 16))
    : 450;

  const close = () => DialogUtils.hide("daySummaryModal");
  const quadrantDuration = (tagId: string) =>
    dayTasks
      .filter((task) => (task.tagId ?? "easy|pressing") === tagId)
      .reduce((sum, task) => sum + task.duration, 0);

  return (
    <Dialog
      open={isOpen}
      as="div"
      className="relative z-50 focus:outline-none"
      onClose={close}
    >
      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="relative flex min-h-full items-start">
          <DialogPanel
            transition
            className="-translate-x-1/2 h-[450px] w-[360px] max-h-[490px] max-w-[calc(100vw-32px)] flex-shrink-0 rounded-[16px] border border-[#eee] bg-white p-5 shadow-modal outline-none duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
            style={
              data
                ? {
                    position: "absolute",
                    top: `${data.y}px`,
                    left: `${Math.max(panelWidth / 2 + 16, Math.min(data.x, window.innerWidth - panelWidth / 2 - 16))}px`,
                    height: `${panelHeight}px`,
                  }
                : {}
            }
          >
            <div className="w-full h-full overflow-y-auto scrollbar-hide">
              <div className="flex flex-col gap-5 font-semibold">
              <section>
                  <h2 className="mb-3 text-[15px] font-semibold text-content">Focus</h2>
                  <div className="px-[10px]">
                    <div className="flex items-center gap-3">
                    <div
                      aria-label={`Completed ${completed} minutes, unfinished ${unfinished} minutes, unplanned ${Math.max(0, DAY_MINUTES - planned)} minutes`}
                      className="flex h-3.5 min-w-0 flex-1 overflow-hidden p-[1px] border border-[#eee] bg-white"
                    >
                      <span
                        className="h-full bg-[#69D571]"
                        style={{
                          width: `${(Math.min(completed, DAY_MINUTES) / DAY_MINUTES) * 100}%`,
                        }}
                      />
                      <span
                        className="h-full bg-[oklch(93.6%_0.032_17.717)]"
                        style={{
                          width: `${(Math.min(unfinished, Math.max(0, DAY_MINUTES - completed)) / DAY_MINUTES) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="flex-shrink-0 whitespace-nowrap text-[12px] font-semibold text-content">
                      {Math.round((completed / DAY_MINUTES) * 100)}%
                    </span>
                  </div>
                    <div className="mt-2 flex gap-3 text-[12px] text-content">
                    <span className="inline-flex items-center gap-1">
                      <i className="size-2 rounded-full bg-[#69D571]" />
                      Done
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <i className="size-2 rounded-full bg-[oklch(93.6%_0.032_17.717)]" />
                      Unfinished
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <i className="size-2 rounded-full border border-[#ddd] bg-white" />
                      Unplanned
                    </span>
                    </div>
                  </div>
                </section>

              <section>
                  <h2 className="mb-3 text-[15px] font-semibold text-content">
                    Tasks
                  </h2>
                  <div className="px-[10px]">
                    <div className="relative mx-auto flex w-full justify-center py-5">
                    <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[12px] text-content">
                      pressing
                    </span>
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[12px] text-content">
                      later
                    </span>
                    <div className="grid w-full grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-1">
                      <span className="whitespace-nowrap text-[12px] text-content">
                        difficulty
                      </span>
                      <div className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-[12px]">
                        {[
                          "easy|pressing",
                          "difficulty|pressing",
                          "easy|later",
                          "difficulty|later",
                        ].map((tagId) => {
                          const tag = TASK_TAGS.find(
                            (item) => item.name === tagId,
                          )!;
                          const duration = quadrantDuration(tagId);
                          const share = totalTaskDuration
                            ? duration / totalTaskDuration
                            : 0;
                          const size = Math.sqrt(share) * 50;
                          const left = tagId.startsWith("easy");
                          const lower = tagId.endsWith("|later");
                          return (
                            <div key={tagId} className="contents">
                              <div
                                aria-label={`${tag.label}: ${Math.round(share * 100)}%`}
                                className="absolute flex items-center justify-center text-[12px] font-semibold text-content"
                                style={{
                                  left: left ? "calc(50% + 2px)" : undefined,
                                  right: left ? undefined : "calc(50% + 2px)",
                                  top: lower ? "calc(50% + 2px)" : undefined,
                                  bottom: lower ? undefined : "calc(50% + 2px)",
                                  width: `${size}%`,
                                  height: `${size}%`,
                                  backgroundColor: tag.backgroundColor,
                                }}
                              >
                                {share > 0 && `${Math.round(share * 100)}%`}
                              </div>
                            </div>
                          );
                        })}
                        <div
                          aria-hidden="true"
                          className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#eee]"
                        />
                        <div
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#eee]"
                        />
                      </div>
                      <span className="whitespace-nowrap text-right text-[12px] text-content">
                        easy
                      </span>
                    </div>
                    </div>
                  </div>
                </section>

              <section>
                  <h2 className="mb-3 text-[15px] font-semibold text-content">
                    Projects
                  </h2>
                  <div className="px-[10px]">
                    <div className="flex flex-col gap-1">
                    {projectTotals.length ? (
                      projectTotals.map((project) => {
                        const tag = TASK_TAGS.find((item) => item.color === project.color);
                        return <div
                          key={project.id}
                          className="flex items-center gap-1"
                        >
                          <span className="w-[64px] truncate text-[12px] text-content">
                            {project.name}
                          </span>
                          <div className="h-[10px] min-w-0 flex-1 overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(project.duration / maxProjectDuration) * 100}%`,
                                backgroundColor: tag ? `color-mix(in srgb, ${project.color} 40%, ${tag.backgroundColor})` : project.color,
                              }}
                            />
                          </div>
                          <span className="w-[52px] text-right text-[12px] text-content">
                            {formatDuration(project.duration)}
                          </span>
                        </div>;
                      })
                    ) : (
                      <p className="text-[12px] text-content">
                        No planned tasks
                      </p>
                    )}
                    </div>
                  </div>
                </section>

              <section>
                  <h2 className="mb-3 text-[15px] font-semibold text-content">Plan</h2>
                  <div className="flex items-center justify-center gap-3 px-[10px]">
                    <div
                      role="img"
                      aria-label={`${formatDuration(focusDuration)} planned out of ${formatDuration(DAY_MINUTES)}`}
                      className="relative size-24 shrink-0 rounded-full"
                      style={{ background: `conic-gradient(var(--primary-blue-300) ${planPercent}%, #eee ${planPercent}% 100%)` }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-[12px] font-semibold text-content">
                        {formatDuration(focusDuration)}
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
