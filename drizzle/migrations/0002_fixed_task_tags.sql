ALTER TABLE "task" ALTER COLUMN "tag_id" TYPE varchar(20) USING "tag_id"::text;
--> statement-breakpoint
UPDATE "task" AS task
SET "tag_id" = tag.name
FROM "tag" AS tag
WHERE task."tag_id" = tag.id::text;
--> statement-breakpoint
UPDATE "task" SET "tag_id" = 'easy' WHERE "tag_id" IS NULL;
--> statement-breakpoint
DROP TABLE "tag";
