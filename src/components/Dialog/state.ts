import { proxy } from "valtio";
import { ModalsContext } from "./type";

export const modalsState = proxy<ModalsContext>({
  activeModalId: null,
  extraData: null,
});
