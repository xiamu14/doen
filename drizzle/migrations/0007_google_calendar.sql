CREATE TABLE "google_calendar_connection" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "account_id" text NOT NULL REFERENCES "account"("id") ON DELETE CASCADE,
  "calendar_id" text,
  "enabled" boolean DEFAULT true NOT NULL,
  "generation" integer DEFAULT 0 NOT NULL,
  "lease_token" text,
  "lease_until" timestamp with time zone,
  "last_synced_at" timestamp with time zone,
  "last_error" text
);
--> statement-breakpoint
CREATE TABLE "google_calendar_queue" (
  "key" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "source_id" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "error" text
);
--> statement-breakpoint
CREATE TABLE "google_calendar_entry" (
  "key" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "source_id" text NOT NULL,
  "variant" text NOT NULL,
  "google_id" text NOT NULL,
  "synced" boolean DEFAULT false NOT NULL,
  "body" jsonb NOT NULL
);
