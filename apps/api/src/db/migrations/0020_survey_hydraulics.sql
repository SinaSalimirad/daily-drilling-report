CREATE TABLE "survey_stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"measured_depth" double precision NOT NULL,
	"inclination" double precision NOT NULL,
	"azimuth" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "survey_stations_well_id_measured_depth_unique" UNIQUE("well_id","measured_depth")
);
--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "rop" double precision;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "particle_diameter" double precision;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "particle_thickness" double precision;--> statement-breakpoint
ALTER TABLE "survey_stations" ADD CONSTRAINT "survey_stations_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE restrict ON UPDATE no action;