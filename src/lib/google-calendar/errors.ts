export class CalendarSyncError extends Error {}

export class CalendarApiError extends CalendarSyncError {
  constructor(public status: number, public reason?: string) {
    super(reason === "SERVICE_DISABLED" || reason === "accessNotConfigured"
      ? "Google Calendar API is not enabled for this Google Cloud project."
      : status === 401 ? "Check the service account credentials."
        : reason === "rateLimitExceeded" || reason === "userRateLimitExceeded" || reason === "quotaExceeded" || status === 429
          ? "Google Calendar rate limit reached. Try syncing later."
          : status === 403 || reason === "insufficientPermissions" || reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT"
            ? "Share the calendar with the service account and allow event changes."
            : status === 404 ? "Check the service account Calendar ID and calendar sharing."
            : `Google Calendar request failed (${status}). Sync manually or wait for the next change.`);
  }
}
