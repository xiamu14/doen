import type { TaskRecord } from "@/client/api/task";
import type { EventRecord } from "@/client/api/event";

export type Modals = {
  taskModal?: { x: number; y: number; top?: number; bottom?: number; task?: TaskRecord; start?: string };
  projectModal?: { projectId: string; name?: string; color?: string; x: number; y: number };
  eventModal?: { x: number; y: number; event?: EventRecord; date?: string };
  daySummaryModal?: { x: number; y: number; date: string };
};
export type ModalIds = keyof Modals;

export type ModalsContext = {
  extraData?: unknown;
  activeModalId: ModalIds | null;
};
