export type Modals = {
  taskModal?: { x: number; y: number; taskId: string };
  projectModal?: { projectId: string; x: number; y: number };
};
export type ModalIds = keyof Modals;

export type ModalsContext = {
  extraData?: unknown;
  activeModalId: ModalIds | null;
};
