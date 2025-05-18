export type Modals = {
  taskModal?: { x: number; y: number; taskId: string };
};
export type ModalIds = keyof Modals;

export type ModalsContext = {
  extraData?: unknown;
  activeModalId: ModalIds | null;
};
