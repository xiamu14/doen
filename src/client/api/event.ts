export type EventRecurrence = "once" | "someday" | "daily" | "weekly" | "monthly";

export type EventRecord = {
  id: string;
  title: string;
  description: string;
  color: string;
  date: string | null;
  time: string | null;
  recurrence: EventRecurrence;
  repeatDay: number | null;
};

export type EventInput = Omit<EventRecord, "id" | "color">;

export async function getEvents(): Promise<EventRecord[]> {
  const response = await fetch("/api/events");
  if (!response.ok) throw new Error("Could not load events.");
  return (await response.json()).data;
}

async function writeEvent(method: "POST" | "PATCH" | "DELETE", event: Partial<EventRecord>) {
  const response = await fetch("/api/events", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not save event.");
  return result.data as EventRecord;
}

export const createEvent = (event: EventInput) => writeEvent("POST", event);
export const updateEvent = (event: EventRecord) => writeEvent("PATCH", event);
export const deleteEvent = (id: string) => writeEvent("DELETE", { id });
