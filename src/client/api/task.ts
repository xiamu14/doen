export type ProjectRecord = { id: string; name: string; color: string };

export async function getList(): Promise<{ data: { project: ProjectRecord[] } }> {
  const response = await fetch("/api/list");
  if (!response.ok) throw new Error("Could not load projects.");
  return response.json();
}

export type TaskRecord = {
  id: string;
  title: string;
  content: string;
  start: string;
  duration: number;
  status: "idle" | "doing" | "done";
  projectId: string | null;
  tagId: "easy" | "difficulty" | "pressing" | "later" | null;
};

export async function getTasks(): Promise<TaskRecord[]> {
  const response = await fetch("/api/tasks");
  if (!response.ok) throw new Error("Could not load tasks.");
  return (await response.json()).data;
}

async function writeTask(method: "POST" | "PATCH" | "DELETE", task: Partial<TaskRecord>) {
  const response = await fetch("/api/tasks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not save task.");
  return result.data as TaskRecord;
}

export const createTask = (task: Omit<TaskRecord, "id">) => writeTask("POST", task);
export const updateTask = (task: TaskRecord) => writeTask("PATCH", task);
export const deleteTask = (id: string) => writeTask("DELETE", { id });
