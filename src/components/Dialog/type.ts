import type { TaskRecord } from "@/client/api/task";

export type Modals = {
  taskModal?: { x: number; y: number; top?: number; bottom?: number; task?: TaskRecord; start?: string };
  projectModal?: { projectId: string; name?: string; color?: string; x: number; y: number };
};
export type ModalIds = keyof Modals;

export type ModalsContext = {
  extraData?: unknown;
  activeModalId: ModalIds | null;
};
