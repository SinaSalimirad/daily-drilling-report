CREATE TYPE "rig_type" AS ENUM('onshore', 'offshore');--> statement-breakpoint
CREATE TYPE "well_designation" AS ENUM('development', 'gas_injection', 'key_well', 'appraisal', 'water_injection', 'water_disposal', 'exploration', 'cuttings_reinjection', 'workover', 'repairing', 're_entry', 'new_leg', 'perforation', 'plugging');--> statement-breakpoint
CREATE TYPE "well_type" AS ENUM('vertical', 'directional');--> statement-breakpoint
CREATE TABLE "wells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"designation" "well_designation",
	"well_type" "well_type" NOT NULL,
	"rig_type" "rig_type" NOT NULL,
	"spud_date" date,
	"water_depth" double precision,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "wells_project_id_name_unique" UNIQUE("project_id","name")
);
--> statement-breakpoint
ALTER TABLE "wells" ADD CONSTRAINT "wells_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE restrict ON UPDATE no action;