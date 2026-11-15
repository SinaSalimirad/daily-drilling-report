CREATE TYPE "report_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"report_no" integer NOT NULL,
	"report_date" date NOT NULL,
	"status" "report_status" DEFAULT 'draft' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "daily_reports_well_id_report_no_unique" UNIQUE("well_id","report_no"),
	CONSTRAINT "daily_reports_well_id_report_date_unique" UNIQUE("well_id","report_date")
);
--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_section_id_drilling_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "drilling_sections"("id") ON DELETE restrict ON UPDATE no action;