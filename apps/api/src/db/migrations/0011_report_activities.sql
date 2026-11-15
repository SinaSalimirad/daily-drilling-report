CREATE TABLE "report_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"hours" double precision NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "report_activities" ADD CONSTRAINT "report_activities_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_activities" ADD CONSTRAINT "report_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE restrict ON UPDATE no action;