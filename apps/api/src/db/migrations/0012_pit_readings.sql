CREATE TYPE "pit_type" AS ENUM('active', 'reserve', 'not_mud');--> statement-breakpoint
CREATE TABLE "pit_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"pit_id" uuid NOT NULL,
	"pit_type" "pit_type" NOT NULL,
	"volume" double precision NOT NULL,
	"mud_weight" double precision,
	"mud_type_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "pit_readings_report_id_pit_id_unique" UNIQUE("report_id","pit_id")
);
--> statement-breakpoint
ALTER TABLE "pit_readings" ADD CONSTRAINT "pit_readings_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pit_readings" ADD CONSTRAINT "pit_readings_pit_id_pits_id_fk" FOREIGN KEY ("pit_id") REFERENCES "pits"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pit_readings" ADD CONSTRAINT "pit_readings_mud_type_id_pit_mud_types_id_fk" FOREIGN KEY ("mud_type_id") REFERENCES "pit_mud_types"("id") ON DELETE restrict ON UPDATE no action;