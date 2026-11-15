CREATE TYPE "volume_item" AS ENUM('water', 'diesel', 'received', 'return', 'dumped', 'shakers', 'evaporation', 'super_clone', 'trip_loss', 'desander_desilter', 'pit_cleaning', 'other', 'formation', 'left_in_hole');--> statement-breakpoint
CREATE TABLE "pump_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"pump_id" uuid NOT NULL,
	"spm" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "pump_readings_report_id_pump_id_unique" UNIQUE("report_id","pump_id")
);
--> statement-breakpoint
CREATE TABLE "volume_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"item" "volume_item" NOT NULL,
	"volume" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "volume_entries_report_id_item_unique" UNIQUE("report_id","item")
);
--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "spp" double precision;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "fluid_not_mud" double precision;--> statement-breakpoint
ALTER TABLE "pump_readings" ADD CONSTRAINT "pump_readings_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pump_readings" ADD CONSTRAINT "pump_readings_pump_id_pumps_id_fk" FOREIGN KEY ("pump_id") REFERENCES "pumps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volume_entries" ADD CONSTRAINT "volume_entries_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE cascade ON UPDATE no action;