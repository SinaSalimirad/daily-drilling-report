CREATE TABLE "bha_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"name" text NOT NULL,
	"length" double precision,
	"outer_diameter" double precision NOT NULL,
	"inner_diameter" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "bha_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"run_no" integer NOT NULL,
	"bit_type" text,
	"bit_size" double precision NOT NULL,
	"manufacturer" text,
	"known_tfa" double precision,
	"tool_pressure_loss" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "bha_runs_well_id_run_no_unique" UNIQUE("well_id","run_no")
);
--> statement-breakpoint
CREATE TABLE "bit_nozzles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"size32" integer NOT NULL,
	"quantity" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "bha_run_id" uuid;--> statement-breakpoint
ALTER TABLE "bha_components" ADD CONSTRAINT "bha_components_run_id_bha_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "bha_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bha_runs" ADD CONSTRAINT "bha_runs_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bit_nozzles" ADD CONSTRAINT "bit_nozzles_run_id_bha_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "bha_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_bha_run_id_bha_runs_id_fk" FOREIGN KEY ("bha_run_id") REFERENCES "bha_runs"("id") ON DELETE restrict ON UPDATE no action;