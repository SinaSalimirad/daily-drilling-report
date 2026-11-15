CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"revision_before" integer NOT NULL,
	"revision_after" integer NOT NULL,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "well_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"well_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "well_members_user_id_well_id_unique" UNIQUE("user_id","well_id")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "well_members" ADD CONSTRAINT "well_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "well_members" ADD CONSTRAINT "well_members_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "well_members" ADD CONSTRAINT "well_members_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "well_members" ADD CONSTRAINT "well_members_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE set null ON UPDATE no action;