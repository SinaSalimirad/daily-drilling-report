CREATE TYPE "section_type" AS ENUM('conductor', 'casing', 'liner', 'open_hole');--> statement-breakpoint
CREATE TABLE "hole_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"type" "section_type" NOT NULL,
	"top" double precision NOT NULL,
	"bottom" double precision NOT NULL,
	"outer_diameter" double precision,
	"inner_diameter" double precision NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "hole_sections" ADD CONSTRAINT "hole_sections_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE restrict ON UPDATE no action;