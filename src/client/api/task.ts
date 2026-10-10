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
  tagId: "easy|pressing" | "easy|later" | "difficulty|pressing" | "difficulty|later" | null;
};

export async function getTasks(): Promise<TaskRecord[]> {
  const response = await fetch("/api/tasks");
  if (!response.ok) throw new Error("Could not load tasks.");
  return (await response.json()).data;
}

export async function scheduleActiveDay(input: {
  activeDay: string;
  taskInstruction: string;
  eventConstraintsEnabled: boolean;
  eventInstruction: string;
  restInstruction: string;
}): Promise<TaskRecord[]> {
  const response = await fetch("/api/ai-copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not arrange tasks.");
  return result.data as TaskRecord[];
}

async function writeTask(method: "POST" | "PATCH" | "DELETE", task: Partial<TaskRecord>) {
  const response = await fetch("/api/tasks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...task, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not save task.");
  return result.data as TaskRecord;
}

export const createTask = (task: Omit<TaskRecord, "id">) => writeTask("POST", task);
export const updateTask = (task: TaskRecord) => writeTask("PATCH", task);
export const deleteTask = (id: string) => writeTask("DELETE", { id });
