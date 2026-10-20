import { getQueryClient } from "@/client/getQueryClient";

export function refreshCalendarStatus() {
  void getQueryClient().invalidateQueries({ queryKey: ["google-calendar"] });
}

export type CalendarStatus = {
  connected: boolean;
  enabled: boolean;
  running: boolean;
  pending: number;
  lastSyncedAt: string | null;
  error: string | null;
  configured: boolean;
};

export function calendarFeedback(error?: string | null) {
  const apiDisabled = error?.includes("API is not enabled") ?? false;
  const wrongAccount = error?.includes("connected to another Google account") ?? false;
  const serviceAccount = error?.toLowerCase().includes("service account") ?? false;
  return {
    blocked: apiDisabled || wrongAccount || serviceAccount,
    message: apiDisabled ? "Enable Google Calendar API to sync."
      : wrongAccount ? "This workspace uses another Google account."
        : error?.startsWith("Share the calendar") ? "Allow the service account to edit this calendar."
          : serviceAccount ? "Check the service account configuration."
          : error?.includes("rate limit") ? "Rate limit reached. Try again later."
              : error ? "Calendar sync failed. Try again." : "",
  };
}

export async function getCalendarStatus(): Promise<CalendarStatus | null> {
  const response = await fetch("/api/google-calendar", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load calendar status.");
  return result.data;
}

export async function changeCalendar(input: { action: "connect" | "sync" } | { action: "toggle"; enabled: boolean }) {
  const response = await fetch("/api/google-calendar", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not update Google Calendar.");
}
