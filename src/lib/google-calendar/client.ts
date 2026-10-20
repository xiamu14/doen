import { CalendarApiError } from "./errors";
import { serviceAccountCredentials, serviceAccountToken } from "./service-account";

export { CalendarApiError, CalendarSyncError } from "./errors";

export async function calendarClient() {
  const credentials = await serviceAccountCredentials();
  const token = await serviceAccountToken(credentials);
  return async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15_000), cache: "no-store",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const error = payload?.error;
      const reasons = [
        ...(Array.isArray(error?.errors) ? error.errors.map((item: { reason?: string } | null) => item?.reason) : []),
        ...(Array.isArray(error?.details) ? error.details.map((item: { reason?: string } | null) => item?.reason) : []),
      ];
      const reason = ["SERVICE_DISABLED", "accessNotConfigured", "ACCESS_TOKEN_SCOPE_INSUFFICIENT", "insufficientPermissions", "rateLimitExceeded", "userRateLimitExceeded", "quotaExceeded"]
        .find((known) => reasons.includes(known));
      throw new CalendarApiError(response.status, reason);
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
  };
}

export type CalendarClient = Awaited<ReturnType<typeof calendarClient>>;
