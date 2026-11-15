CREATE TABLE "report_results" (
	"report_id" uuid PRIMARY KEY NOT NULL,
	"revision" integer NOT NULL,
	"engine_version" text NOT NULL,
	"is_stale" boolean DEFAULT false NOT NULL,
	"payload" jsonb NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "report_results" ADD CONSTRAINT "report_results_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE cascade ON UPDATE no action;