import TaskModal from "./task-modal";
import ProjectModal from "./project-modal";
import EventModal from "./event-modal";
import DaySummaryModal from "./day-summary-modal";

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
      <EventModal />
      <DaySummaryModal />
    </>
  );
}
