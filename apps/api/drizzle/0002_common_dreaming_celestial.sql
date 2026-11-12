CREATE TYPE "public"."wells_currency" AS ENUM('USD', 'GBP', 'EUR', 'CNY', 'IRR');--> statement-breakpoint
CREATE TYPE "public"."wells_designationEnum" AS ENUM('exploration', 'cuttings', 're-injection', 'work-over', 'repairing', 're-entry', 'new leg', 'perforation', 'plugging');--> statement-breakpoint
CREATE TYPE "public"."well_rigType" AS ENUM('offshore', 'onshore');--> statement-breakpoint
CREATE TYPE "public"."well_wellType" AS ENUM('Directional', 'Vertical');--> statement-breakpoint
CREATE TABLE "inventories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"report_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"init" integer DEFAULT 0 NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"received" integer DEFAULT 0 NOT NULL,
	"returned" integer DEFAULT 0 NOT NULL,
	"unit_price" numeric(12, 3),
	"note" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_report_id_product_id_unique" UNIQUE("report_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"well_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"report_number" integer NOT NULL,
	"date" date NOT NULL,
	"operator_reporter" varchar(255) NOT NULL,
	"contractor_reporter" varchar(255) NOT NULL,
	"well_status" varchar(255) NOT NULL,
	"mud_type" varchar(255) NOT NULL,
	"present_activity" varchar(255) NOT NULL,
	"bit_depth" numeric(12, 3) NOT NULL,
	"total_depth" numeric(12, 3) NOT NULL,
	"tvd" numeric(12, 3) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_well_id_date_unique" UNIQUE("well_id","date"),
	CONSTRAINT "reports_well_id_report_number_unique" UNIQUE("well_id","report_number")
);
--> statement-breakpoint
CREATE TABLE "section" (
	"id" uuid PRIMARY KEY NOT NULL,
	"well_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sections_well_id_name_unique" UNIQUE("well_id","name"),
	CONSTRAINT "sections_well_id_sequence_unique" UNIQUE("well_id","sequence"),
	CONSTRAINT "sections_id_well_id_unique" UNIQUE("id","well_id")
);
--> statement-breakpoint
CREATE TABLE "wells" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"operators" varchar(255)[] NOT NULL,
	"contractors" varchar(255)[] NOT NULL,
	"field" varchar(255) NOT NULL,
	"designation" "wells_designationEnum" NOT NULL,
	"spud_date" date NOT NULL,
	"currency" "wells_currency" NOT NULL,
	"type" "well_wellType" NOT NULL,
	"rig_name" varchar(255) NOT NULL,
	"rig_type" "well_rigType" NOT NULL,
	"water_depth" numeric(12, 3),
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wells_name_field_unique" UNIQUE("name","field"),
	CONSTRAINT "wells_operators_count_check" CHECK (cardinality("wells"."operators") BETWEEN 1 AND 3),
	CONSTRAINT "wells_contractors_count_check" CHECK (cardinality("wells"."contractors") BETWEEN 1 AND 3),
	CONSTRAINT "wells_water_depth_rig_type_check" CHECK (("wells"."rig_type" = 'offshore') = ("wells"."water_depth" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_section_same_well_fk" FOREIGN KEY ("section_id","well_id") REFERENCES "public"."section"("id","well_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE no action ON UPDATE no action;