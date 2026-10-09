CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" varchar(1024) DEFAULT '' NOT NULL,
	"event_date" date NOT NULL,
	"event_time" varchar(5) NOT NULL,
	"recurrence" varchar(10) DEFAULT 'once' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
