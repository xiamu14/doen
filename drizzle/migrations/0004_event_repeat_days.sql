ALTER TABLE "event" ADD COLUMN "repeat_day" smallint;
--> statement-breakpoint
UPDATE "event" SET "repeat_day" = EXTRACT(DOW FROM "event_date")::smallint WHERE "recurrence" = 'weekly';
--> statement-breakpoint
UPDATE "event" SET "repeat_day" = EXTRACT(DAY FROM "event_date")::smallint WHERE "recurrence" = 'monthly';
--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "event_date" DROP NOT NULL;
--> statement-breakpoint
UPDATE "event" SET "event_date" = NULL WHERE "recurrence" <> 'once';
