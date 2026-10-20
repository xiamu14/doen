ALTER TABLE "google_calendar_connection" ALTER COLUMN "account_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "google_calendar_connection" ADD COLUMN "service_account_email" text;
--> statement-breakpoint
ALTER TABLE "google_calendar_connection" DROP CONSTRAINT "google_calendar_connection_account_id_fkey";
--> statement-breakpoint
ALTER TABLE "google_calendar_connection" ADD CONSTRAINT "google_calendar_connection_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE SET NULL;
