import { unknown } from "zod";
import TaskModal from "./task-modal";

export default function DialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <TaskModal />
    </>
  );
}
