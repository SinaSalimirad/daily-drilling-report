CREATE TYPE "pump_type" AS ENUM('duplex', 'triplex');--> statement-breakpoint
CREATE TABLE "pumps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"model" text NOT NULL,
	"type" "pump_type" NOT NULL,
	"liner_diameter" double precision NOT NULL,
	"stroke_length" double precision NOT NULL,
	"efficiency" double precision NOT NULL,
	"sort_order" integer NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "pumps" ADD CONSTRAINT "pumps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE restrict ON UPDATE no action;