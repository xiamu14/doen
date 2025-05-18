import { modalsState } from "./state";
import { ModalIds, Modals } from "./type";

export { default as Provider } from "./provider";

export const DialogUtils = {
  show: <T extends ModalIds>(id: T, value: Modals[T]) => {
    modalsState.activeModalId = id;
    modalsState.extraData = value;
  },
  hide: (id: ModalIds) => {
    modalsState.activeModalId = null;
  },
};
