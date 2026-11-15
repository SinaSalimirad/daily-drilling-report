CREATE TYPE "fluid_type" AS ENUM('wbm', 'obm', 'brine');--> statement-breakpoint
CREATE TABLE "drilling_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"hole_size" double precision NOT NULL,
	"fluid_type" "fluid_type" NOT NULL,
	"fluid_system_id" uuid,
	"plan_mud_weight" double precision,
	"plan_yield_point" double precision,
	"plan_fluid_loss" double precision,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "drilling_sections" ADD CONSTRAINT "drilling_sections_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drilling_sections" ADD CONSTRAINT "drilling_sections_fluid_system_id_fluid_systems_id_fk" FOREIGN KEY ("fluid_system_id") REFERENCES "fluid_systems"("id") ON DELETE restrict ON UPDATE no action;