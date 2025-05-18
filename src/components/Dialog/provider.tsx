import TaskModal from "./task-modal";
import ProjectModal from "./project-modal";

export default function DialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <TaskModal />
      <ProjectModal />
    </>
  );
}
